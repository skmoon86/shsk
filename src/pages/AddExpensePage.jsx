import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, X, Plus, ListPlus, Trash2, Sparkles } from 'lucide-react'
import dayjs from 'dayjs'
import { supabase, withTimeout, xhrUpload, getAccessTokenFromStorage } from '@/lib/supabase'
import { resizeImage, blobToBase64, DEBUG_PHOTO } from '@/lib/image'
import { useAuthStore } from '@/stores/authStore'
import { useExpenses } from '@/hooks/useExpenses'
import { useCategories } from '@/hooks/useCategories'
import toast from 'react-hot-toast'

const ICON_OPTIONS = [
  '🛒','🍜','☕','🍺','📦','🍱','🍕','🍔','🥗','🧁',
  '🍣','🥩','🍳','🥤','🧃','🍰','🍩','🥐','🍎','🥬',
  '🧀','🍿','🫘','🥚','🐟','🍦','🫖','🧋','🍷','🎂',
  '👨','👩',
]

const COLOR_OPTIONS = [
  '#22c55e','#f97316','#a78bfa','#facc15','#94a3b8',
  '#ef4444','#3b82f6','#ec4899','#14b8a6','#8b5cf6',
]

function ItemInput({ value, onChange, household }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [allItemNames, setAllItemNames] = useState([])
  const [loaded, setLoaded] = useState(false)
  const inputRef = useRef()

  const loadItemNames = useCallback(async () => {
    if (loaded || !household) return
    const { data } = await supabase
      .from('expense_items')
      .select('name, expenses!inner(household_id)')
      .eq('expenses.household_id', household.id)
    if (data) {
      const unique = [...new Set(data.map(d => d.name))]
      setAllItemNames(unique)
    }
    setLoaded(true)
  }, [household, loaded])

  const handleChange = (val) => {
    onChange(val)
    if (val.trim().length > 0) {
      const filtered = allItemNames.filter(n =>
        n.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (name) => {
    onChange(name)
    setShowSuggestions(false)
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={value}
        onFocus={loadItemNames}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="품목명"
        className="w-full bg-surface-0 border border-surface-200 rounded-xl px-3 py-2.5 text-sm font-body outline-none focus:ring-2 focus:ring-brand-300"
      />
      {showSuggestions && (
        <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-surface-0 border border-surface-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map(name => (
            <button
              key={name}
              onMouseDown={() => selectSuggestion(name)}
              className="w-full text-left px-3 py-2 text-sm font-body hover:bg-brand-50 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AddExpensePage() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const isEdit = !!editId
  const { household } = useAuthStore()
  const { addExpense, updateExpense, deleteExpense } = useExpenses()
  const { categories, addCategory, deleteCategory } = useCategories()
  const fileRef = useRef()
  const longPressTimer = useRef(null)

  const [amount, setAmount]       = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState('📦')
  const [selectedColor, setSelectedColor] = useState('#94a3b8')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [memo, setMemo]           = useState('')
  const [date, setDate]           = useState(dayjs().format('YYYY-MM-DD'))
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [photo, setPhoto]         = useState(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showItems, setShowItems] = useState(false)
  const [items, setItems]         = useState([{ name: '', quantity: '1', amount: '' }])
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [analyzing, setAnalyzing]     = useState(false)

  // Load existing expense for edit mode
  useEffect(() => {
    if (!editId || !household) return
    setLoadingEdit(true)

    const load = async () => {
      // 1. Load expense
      const { data: expense, error } = await supabase
        .from('expenses')
        .select('*, categories(name, icon, color)')
        .eq('id', editId)
        .eq('household_id', household.id)
        .single()

      if (error || !expense) {
        toast.error('지출 내역을 불러오지 못했어요.')
        navigate('/history', { replace: true })
        return
      }

      setAmount(expense.amount.toLocaleString('ko-KR'))
      setCategoryId(expense.category_id || '')
      setMemo(expense.memo || '')
      setDate(expense.date)
      setPaymentMethod(expense.payment_method || 'card')
      if (expense.photo_url) setExistingPhotoUrl(expense.photo_url)

      // 2. Load items separately
      const { data: itemsData } = await supabase
        .from('expense_items')
        .select('*')
        .eq('expense_id', editId)
        .order('created_at', { ascending: true })

      if (itemsData && itemsData.length > 0) {
        setShowItems(true)
        setItems(itemsData.map(i => ({
          name: i.name,
          quantity: String(i.quantity || 1),
          amount: i.amount.toLocaleString('ko-KR'),
        })))
      }

      setLoadingEdit(false)
    }

    load()
  }, [editId, household])

  const filteredCategories = customCategory.trim()
    ? categories.filter(c => c.name.includes(customCategory.trim()))
    : categories

  const exactMatch = categories.find(c => c.name === customCategory.trim())

  const handleCategorySelect = (cat) => {
    setCategoryId(cat.id)
    setCustomCategory(cat.name)
    setShowCategoryInput(false)
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto({ file, preview: URL.createObjectURL(file) })
    setExistingPhotoUrl(null)
  }

  const analyzeReceipt = async () => {
    if (!photo?.file) { toast.error('먼저 영수증 사진을 첨부해주세요'); return }
    setAnalyzing(true)
    const loadingToast = toast.loading('영수증 분석 중...')
    try {
      // 1) 1024px JPEG로 압축 → base64
      const blob   = await resizeImage(photo.file, { maxDim: 1024, quality: 0.8 })
      const base64 = await blobToBase64(blob)

      // 2) Edge Function 호출
      const { data, error } = await supabase.functions.invoke('parse-receipt', {
        body: { image_base64: base64, mime: 'image/jpeg' },
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || '분석에 실패했어요')

      const result = data.result || {}
      if (result.error) throw new Error(result.error)

      // 3) 폼에 자동 채움
      if (Array.isArray(result.items) && result.items.length > 0) {
        setShowItems(true)
        setItems(result.items.map(i => ({
          name: String(i.name || ''),
          quantity: String(i.quantity || 1),
          amount: (parseInt(i.amount, 10) || 0).toLocaleString('ko-KR'),
        })))
      } else if (result.total) {
        setAmount(parseInt(result.total, 10).toLocaleString('ko-KR'))
      }
      if (result.memo) setMemo(prev => prev || result.memo)

      toast.success('분석 완료! 내용을 확인해주세요.', { id: loadingToast })
    } catch (err) {
      console.error('[analyzeReceipt]', err)
      toast.error(err?.message || '분석에 실패했어요', { id: loadingToast })
    } finally {
      setAnalyzing(false)
    }
  }

  const uploadPhoto = async (file) => {
    const dbg = (msg) => { if (DEBUG_PHOTO) toast(msg, { duration: 2500 }) }
    try {
      console.log('[uploadPhoto] start', { name: file?.name, type: file?.type, size: file?.size })
      dbg(`A. uploadPhoto 진입`)

      // 1) 리사이즈 시도 (1024px JPEG). 실패하면 원본 그대로 업로드.
      let body = file
      let contentType = file.type || 'image/jpeg'
      let ext = 'jpg'
      try {
        body = await resizeImage(file, { maxDim: 1024, quality: 0.8 })
        contentType = 'image/jpeg'
        ext = 'jpg'
        console.log('[uploadPhoto] resized', { size: body.size })
      } catch (resizeErr) {
        console.warn('[uploadPhoto] resize failed, falling back to original', resizeErr)
        dbg(`B. 리사이즈 실패: ${resizeErr?.message || resizeErr}`)
        toast('이미지 변환을 건너뛰고 원본을 업로드해요')
        // 원본 확장자 유지 시도
        const guessed = (file.name || '').split('.').pop()
        if (guessed && guessed.length <= 5) ext = guessed
      }

      const path = `${household.id}/${Date.now()}.${ext}`
      dbg(`C. Storage 업로드 시작 ${(body.size / 1024).toFixed(0)}KB`)

      // 2) supabase.auth.getSession()이 삼성 인터넷에서 navigator.locks
      //    hang 때문에 멈추는 이슈가 있어 localStorage에서 직접 꺼낸다.
      const accessToken = getAccessTokenFromStorage()
      if (!accessToken) throw new Error('로그인 세션을 찾을 수 없어요')
      dbg('C1. 세션 OK, XHR 시작')

      const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/receipts/${path}`
      await xhrUpload(url, body, contentType, accessToken, dbg)
      const { data: pub } = supabase.storage.from('receipts').getPublicUrl(path)
      console.log('[uploadPhoto] done', pub.publicUrl)
      dbg(`D. 업로드 완료`)
      return pub.publicUrl
    } catch (err) {
      console.error('[uploadPhoto]', err)
      dbg(`X. 예외: ${err?.message || err}`)
      toast.error(err?.message || '사진 업로드 실패')
      return null
    }
  }

  const validItems = items.filter(i => i.name.trim() && parseInt(String(i.amount).replace(/,/g, ''), 10) > 0)
  const itemsTotal = validItems.reduce((s, i) => {
    const qty = parseInt(i.quantity, 10) || 1
    const amt = parseInt(String(i.amount).replace(/,/g, ''), 10)
    return s + amt * qty
  }, 0)

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      if (field === 'amount') return { ...item, [field]: formatAmount(value) }
      if (field === 'quantity') return { ...item, [field]: value.replace(/[^0-9]/g, '') }
      return { ...item, [field]: value }
    }))
  }
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const addItem = () => setItems(prev => [...prev, { name: '', quantity: '1', amount: '' }])

  const handleSubmit = async () => {
    let amt
    if (showItems && validItems.length > 0) {
      amt = itemsTotal
    } else {
      amt = parseInt(amount.replace(/,/g, ''), 10)
    }
    if (!amt || amt <= 0) { toast.error('금액을 입력해주세요'); return }

    setUploading(true)
    try {
      let finalCategoryId = categoryId
      if (!finalCategoryId && customCategory.trim()) {
        const existing = categories.find(c => c.name === customCategory.trim())
        if (existing) {
          finalCategoryId = existing.id
        } else {
          const newCat = await addCategory(customCategory.trim(), selectedIcon, selectedColor)
          if (!newCat) return
          finalCategoryId = newCat.id
        }
      }

      if (!finalCategoryId) { toast.error('카테고리를 선택해주세요'); return }

      let photo_url = existingPhotoUrl || null
      if (photo?.file) photo_url = await uploadPhoto(photo.file)

      const expenseItems = showItems ? validItems.map(i => ({
        name: i.name.trim(),
        quantity: parseInt(i.quantity, 10) || 1,
        amount: parseInt(String(i.amount).replace(/,/g, ''), 10),
      })) : []

      if (isEdit) {
        const ok = await updateExpense(editId, {
          amount: amt, category_id: finalCategoryId, memo, date, photo_url, payment_method: paymentMethod,
        }, expenseItems)
        if (ok) navigate('/history', { replace: true })
      } else {
        const ok = await addExpense({ amount: amt, category_id: finalCategoryId, memo, date, photo_url, payment_method: paymentMethod }, expenseItems)
        if (ok) navigate('/')
      }
    } catch (err) {
      console.error('[handleSubmit]', err)
      toast.error(err?.message || '저장 중 오류가 발생했어요.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    setUploading(true)
    try {
      const ok = await deleteExpense(editId)
      if (ok) navigate('/history', { replace: true })
    } catch (err) {
      console.error('[handleDelete]', err)
      toast.error(err?.message || '삭제 중 오류가 발생했어요.')
    } finally {
      setUploading(false)
    }
  }

  const formatAmount = (val) => {
    const num = val.replace(/[^0-9]/g, '')
    return num ? parseInt(num, 10).toLocaleString('ko-KR') : ''
  }

  if (loadingEdit) {
    return <div className="flex items-center justify-center h-64 text-surface-800/30 font-body text-sm">불러오는 중...</div>
  }

  return (
    <div className="px-5 pt-8 pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">{isEdit ? '지출 수정' : '지출 입력'}</h1>
        {isEdit && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-sm font-body transition-colors"
          >
            <Trash2 size={16} />
            삭제
          </button>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <label className="text-xs font-display font-semibold text-surface-800/50 uppercase tracking-wide">금액</label>
        <div className={`flex items-center gap-2 bg-surface-0 border border-surface-200 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-brand-300 ${showItems && validItems.length > 0 ? 'opacity-50' : ''}`}>
          <input
            type="text"
            inputMode="numeric"
            value={showItems && validItems.length > 0 ? itemsTotal.toLocaleString('ko-KR') : amount}
            onChange={e => setAmount(formatAmount(e.target.value))}
            placeholder="0"
            disabled={showItems && validItems.length > 0}
            className="flex-1 font-display font-bold text-2xl outline-none bg-transparent text-right disabled:text-surface-800"
          />
          <span className="font-body text-surface-800/50">원</span>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-xs font-display font-semibold text-surface-800/50 uppercase tracking-wide">카테고리</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat)}
              onTouchStart={() => {
                longPressTimer.current = setTimeout(() => setDeleteTarget(cat), 600)
              }}
              onTouchEnd={() => clearTimeout(longPressTimer.current)}
              onTouchMove={() => clearTimeout(longPressTimer.current)}
              onMouseDown={() => {
                longPressTimer.current = setTimeout(() => setDeleteTarget(cat), 600)
              }}
              onMouseUp={() => clearTimeout(longPressTimer.current)}
              onMouseLeave={() => clearTimeout(longPressTimer.current)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl border text-sm font-body transition-all select-none ${
                categoryId === cat.id && !showCategoryInput
                  ? 'border-transparent text-white shadow-card'
                  : 'border-surface-200 text-surface-800 bg-surface-0'
              }`}
              style={categoryId === cat.id && !showCategoryInput ? { backgroundColor: cat.color } : {}}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
          <button
            onClick={() => {
              setShowCategoryInput(true)
              setCategoryId('')
              setCustomCategory('')
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl border text-sm font-body transition-all ${
              showCategoryInput
                ? 'border-brand-500 text-brand-600 bg-brand-50'
                : 'border-dashed border-surface-300 text-surface-800/40'
            }`}
          >
            <Plus size={14} />
            직접 입력
          </button>
        </div>

        {showCategoryInput && (
          <div className="relative">
            <input
              value={customCategory}
              onChange={e => {
                setCustomCategory(e.target.value)
                const match = categories.find(c => c.name === e.target.value.trim())
                setCategoryId(match ? match.id : '')
              }}
              placeholder="카테고리명 입력 (예: 간식, 반찬)"
              autoFocus
              className="w-full bg-surface-0 border border-surface-200 rounded-2xl px-4 py-3 font-body text-sm outline-none focus:ring-2 focus:ring-brand-300"
            />
            {customCategory.trim() && !exactMatch && (
              <div className="mt-3 space-y-3">
                <p className="text-xs font-body text-brand-500">
                  "{customCategory.trim()}" 카테고리가 새로 만들어집니다
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-display font-semibold text-surface-800/40">아이콘</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_OPTIONS.map(icon => (
                      <button key={icon} onClick={() => setSelectedIcon(icon)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg transition-all ${
                          selectedIcon === icon ? 'bg-brand-100 ring-2 ring-brand-400 scale-110' : 'bg-surface-50 hover:bg-surface-100'
                        }`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-display font-semibold text-surface-800/40">색상</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(color => (
                      <button key={color} onClick={() => setSelectedColor(color)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          selectedColor === color ? 'ring-2 ring-offset-2 ring-brand-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {customCategory.trim() && filteredCategories.length > 0 && !exactMatch && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {filteredCategories.slice(0, 5).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-surface-200 bg-surface-0 text-xs font-body text-surface-800 hover:bg-brand-50 transition-colors"
                  >
                    <span>{cat.icon}</span> {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <label className="text-xs font-display font-semibold text-surface-800/50 uppercase tracking-wide">결제 방법</label>
        <div className="flex gap-2">
          {[
            { value: 'card', label: '💳 카드' },
            { value: 'cash', label: '💵 현금' },
            { value: 'local_currency', label: '🏷️ 지역화폐' },
          ].map(m => (
            <button
              key={m.value}
              onClick={() => setPaymentMethod(m.value)}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-body transition-all border ${
                paymentMethod === m.value
                  ? 'bg-brand-500 text-white border-transparent shadow-card'
                  : 'bg-surface-0 text-surface-800 border-surface-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <label className="text-xs font-display font-semibold text-surface-800/50 uppercase tracking-wide">날짜</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-surface-0 border border-surface-200 rounded-2xl px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        <button
          onClick={() => setShowItems(!showItems)}
          className={`flex items-center gap-2 text-sm font-display font-semibold transition-all ${
            showItems ? 'text-brand-500' : 'text-surface-800/40'
          }`}
        >
          <ListPlus size={16} />
          상세 품목 {showItems ? '접기' : '추가'}
        </button>

        {showItems && (
          <div className="bg-surface-50 rounded-2xl p-4 space-y-3">
            {items.map((item, idx) => {
              const qty = parseInt(item.quantity, 10) || 1
              const unitAmt = parseInt(String(item.amount).replace(/,/g, ''), 10) || 0
              const lineTotal = unitAmt * qty
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ItemInput
                      value={item.name}
                      onChange={val => updateItem(idx, 'name', val)}
                      household={household}
                    />
                    <div className="flex items-center gap-1 bg-surface-0 border border-surface-200 rounded-xl px-2 py-2.5 focus-within:ring-2 focus-within:ring-brand-300">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="1"
                        className="w-8 text-center text-sm font-display font-semibold outline-none bg-transparent"
                      />
                      <span className="text-xs text-surface-800/40">개</span>
                    </div>
                    <div className="flex items-center gap-1 bg-surface-0 border border-surface-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-300">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.amount}
                        onChange={e => updateItem(idx, 'amount', e.target.value)}
                        placeholder="0"
                        className="w-16 text-right text-sm font-display font-semibold outline-none bg-transparent"
                      />
                      <span className="text-xs text-surface-800/40">원</span>
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {qty > 1 && unitAmt > 0 && (
                    <p className="text-[11px] font-body text-surface-800/35 text-right pr-1">
                      {unitAmt.toLocaleString('ko-KR')}원 x {qty}개 = {lineTotal.toLocaleString('ko-KR')}원
                    </p>
                  )}
                </div>
              )
            })}
            <button onClick={addItem}
              className="flex items-center gap-1 text-xs font-body text-brand-500 hover:text-brand-600">
              <Plus size={14} /> 품목 추가
            </button>
            {validItems.length > 0 && (
              <div className="flex justify-between pt-2 border-t border-surface-200">
                <span className="text-xs font-body text-surface-800/50">합계</span>
                <span className="text-sm font-display font-bold">{itemsTotal.toLocaleString('ko-KR')}원</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Memo */}
      <div className="space-y-1.5">
        <label className="text-xs font-display font-semibold text-surface-800/50 uppercase tracking-wide">메모</label>
        <input
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="어디서 뭘 먹었나요?"
          className="w-full bg-surface-0 border border-surface-200 rounded-2xl px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <label className="text-xs font-display font-semibold text-surface-800/50 uppercase tracking-wide">영수증 사진</label>
        {photo ? (
          <div className="flex items-start gap-3">
            <div className="relative inline-block">
              <img src={photo.preview} alt="영수증" className="w-24 h-24 object-cover rounded-2xl border border-surface-200" />
              <button onClick={() => setPhoto(null)}
                className="absolute -top-2 -right-2 bg-surface-900 text-white rounded-full p-0.5">
                <X size={12} />
              </button>
            </div>
            <button
              onClick={analyzeReceipt}
              disabled={analyzing}
              className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-600 rounded-2xl px-3 py-2 text-xs font-body font-semibold hover:bg-brand-100 transition-all disabled:opacity-50"
            >
              <Sparkles size={14} />
              {analyzing ? '분석 중...' : 'AI로 분석'}
            </button>
          </div>
        ) : existingPhotoUrl ? (
          <div className="relative inline-block">
            <img src={existingPhotoUrl} alt="영수증" className="w-24 h-24 object-cover rounded-2xl border border-surface-200" />
            <button onClick={() => setExistingPhotoUrl(null)}
              className="absolute -top-2 -right-2 bg-surface-900 text-white rounded-full p-0.5">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current.click()}
            className="flex items-center gap-2 bg-surface-0 border border-dashed border-surface-200 rounded-2xl px-4 py-3 text-sm font-body text-surface-800/40 hover:border-brand-300 transition-all">
            <Camera size={16} /> 사진 첨부
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={uploading}
        className="w-full bg-brand-500 text-white rounded-2xl py-4 font-display font-semibold shadow-card hover:bg-brand-600 transition-all disabled:opacity-50"
      >
        {uploading ? '저장 중...' : isEdit ? '수정하기' : '저장하기'}
      </button>

      {/* Delete category confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface-0 rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <span className="text-3xl">{deleteTarget.icon}</span>
              <p className="font-display font-bold text-surface-900">
                "{deleteTarget.name}" 삭제
              </p>
              <p className="text-sm font-body text-surface-800/50">
                이 카테고리를 삭제하시겠어요?<br />
                해당 카테고리의 지출 기록은 유지됩니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-2xl border border-surface-200 font-body text-sm text-surface-800 transition-all hover:bg-surface-50"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  const ok = await deleteCategory(deleteTarget.id)
                  if (ok && categoryId === deleteTarget.id) setCategoryId('')
                  setDeleteTarget(null)
                }}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-body text-sm font-semibold transition-all hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete expense confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-surface-0 rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <span className="text-3xl">🗑️</span>
              <p className="font-display font-bold text-surface-900">지출 삭제</p>
              <p className="text-sm font-body text-surface-800/50">
                이 지출 기록을 삭제하시겠어요?<br />
                삭제하면 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-surface-200 font-body text-sm text-surface-800 transition-all hover:bg-surface-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-body text-sm font-semibold transition-all hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

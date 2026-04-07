"""밥상기록 앱 설명 자료 PDF 생성 스크립트"""

from fpdf import FPDF
import os

class ReportPDF(FPDF):
    def __init__(self):
        super().__init__()
        # 한글 폰트 등록
        font_path = self._find_korean_font()
        if font_path:
            self.add_font("Korean", "", font_path, uni=True)
            self.add_font("Korean", "B", self._find_korean_font(bold=True) or font_path, uni=True)
            self.font_name = "Korean"
        else:
            raise RuntimeError("한글 폰트를 찾을 수 없습니다.")

    def _find_korean_font(self, bold=False):
        candidates_regular = [
            "C:/Windows/Fonts/malgun.ttf",
            "C:/Windows/Fonts/NanumGothic.ttf",
            "C:/Windows/Fonts/gulim.ttc",
        ]
        candidates_bold = [
            "C:/Windows/Fonts/malgunbd.ttf",
            "C:/Windows/Fonts/NanumGothicBold.ttf",
        ]
        for f in (candidates_bold if bold else candidates_regular):
            if os.path.exists(f):
                return f
        return None

    def header(self):
        if self.page_no() > 1:
            self.set_font(self.font_name, "", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 8, "밥상기록 — 서비스 설명 자료", align="R")
            self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font(self.font_name, "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")

    def section_title(self, title):
        self.ln(4)
        self.set_font(self.font_name, "B", 14)
        self.set_text_color(30, 64, 120)
        self.cell(0, 10, title)
        self.ln(8)
        # 밑줄
        self.set_draw_color(30, 64, 120)
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(6)

    def sub_title(self, title):
        self.ln(2)
        self.set_font(self.font_name, "B", 11)
        self.set_text_color(60, 60, 60)
        self.cell(0, 8, title)
        self.ln(7)

    def body_text(self, text):
        self.set_font(self.font_name, "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font(self.font_name, "", 10)
        self.set_text_color(40, 40, 40)
        x = self.get_x()
        self.cell(6, 6, "•")
        self.multi_cell(0, 6, text)
        self.ln(1)

    def add_table(self, headers, data, col_widths=None):
        if col_widths is None:
            col_widths = [(self.w - self.l_margin - self.r_margin) / len(headers)] * len(headers)

        # Header
        self.set_font(self.font_name, "B", 9)
        self.set_fill_color(30, 64, 120)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, border=1, align="C", fill=True)
        self.ln()

        # Data rows
        self.set_font(self.font_name, "", 9)
        self.set_text_color(40, 40, 40)
        fill = False
        for row in data:
            if fill:
                self.set_fill_color(240, 245, 255)
            else:
                self.set_fill_color(255, 255, 255)
            for i, val in enumerate(row):
                align = "R" if i < len(headers) and ("금액" in headers[i] or "합계" in headers[i] or "건수" in headers[i]) else "C"
                self.cell(col_widths[i], 7, str(val), border=1, align=align, fill=True)
            self.ln()
            fill = not fill
        self.ln(4)


def generate():
    pdf = ReportPDF()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ─── 표지 ───
    pdf.add_page()
    pdf.ln(50)
    pdf.set_font(pdf.font_name, "B", 28)
    pdf.set_text_color(30, 64, 120)
    pdf.cell(0, 15, "밥상기록", align="C")
    pdf.ln(14)
    pdf.set_font(pdf.font_name, "", 14)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 10, "가족/커플 식비 가계부 앱", align="C")
    pdf.ln(20)

    pdf.set_font(pdf.font_name, "", 11)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 8, "서비스 설명 자료", align="C")
    pdf.ln(6)
    pdf.cell(0, 8, "2026년 4월", align="C")
    pdf.ln(40)

    pdf.set_draw_color(200, 200, 200)
    pdf.set_line_width(0.3)
    pdf.line(60, pdf.get_y(), pdf.w - 60, pdf.get_y())

    # ─── 1. 서비스 소개 ───
    pdf.add_page()
    pdf.section_title("1. 서비스 소개")

    pdf.body_text(
        "밥상기록은 가족 또는 커플이 함께 사용하는 식비 전용 가계부 앱입니다. "
        "구글 로그인 한 번이면 바로 시작할 수 있으며, 초대 코드를 공유해 같은 그룹으로 묶여 "
        "식비를 함께 기록하고 관리합니다."
    )
    pdf.ln(2)

    pdf.sub_title("핵심 특징")
    pdf.bullet("구글 계정으로 간편 로그인 (별도 회원가입 불필요)")
    pdf.bullet("초대 코드 한 줄로 가족/커플 그룹 연결")
    pdf.bullet("누가 입력했는지 구분하지 않는 공동 장부 컨셉")
    pdf.bullet("카테고리별 지출 분석 및 월별 통계 차트 제공")
    pdf.bullet("영수증 사진 첨부 기능")
    pdf.bullet("모바일 최적화 UI (하단 탭 네비게이션)")

    # ─── 2. 사용자 흐름 ───
    pdf.section_title("2. 사용자 흐름")

    pdf.sub_title("2-1. 최초 가입 흐름")
    pdf.body_text("① 구글 로그인 → ② 그룹 생성 또는 초대코드 입력 → ③ 대시보드 진입")
    pdf.ln(2)

    pdf.sub_title("2-2. 그룹 생성")
    pdf.body_text(
        "처음 사용하는 유저가 '그룹 만들기'를 선택하면 자동으로 초대 코드가 생성됩니다. "
        "이 코드를 가족이나 파트너에게 공유하면, 상대방이 코드를 입력해 같은 그룹에 참여합니다. "
        "그룹 생성 시 기본 카테고리 5개(식료품, 외식, 배달, 카페/음료, 간식)가 자동으로 만들어집니다."
    )
    pdf.ln(2)

    pdf.sub_title("2-3. 일상 사용 흐름")
    pdf.body_text(
        "로그인 → 대시보드에서 이번 달 지출 현황 확인 → "
        "하단 '+' 탭으로 지출 입력 → 내역 탭에서 과거 기록 조회/삭제 → "
        "통계 탭에서 소비 패턴 분석"
    )

    # ─── 3. 주요 화면 설명 ───
    pdf.section_title("3. 주요 화면 설명")

    screens = [
        ("대시보드", "이번 달 총 지출 금액, 카테고리별 요약, 최근 입력 5건을 한눈에 보여줍니다."),
        ("지출 입력", "금액·카테고리·날짜·메모를 입력하고, 필요 시 영수증 사진을 첨부합니다."),
        ("지출 내역", "전체 지출을 날짜별로 그룹핑하여 보여주며, 카테고리·기간 필터와 삭제 기능을 제공합니다."),
        ("통계", "파이 차트(카테고리 비중)와 바 차트(월별 추이)로 소비 패턴을 시각화합니다."),
        ("설정", "프로필 정보 확인, 초대 코드 복사, 로그아웃 기능을 제공합니다."),
    ]

    headers = ["화면", "설명"]
    col_widths = [35, 135]
    pdf.add_table(headers, screens, col_widths)

    # ─── 4. 샘플 데이터 ───
    pdf.section_title("4. 샘플 데이터")

    pdf.sub_title("4-1. 그룹 정보")
    pdf.add_table(
        ["그룹명", "초대 코드", "생성일"],
        [
            ["우리집 밥상", "ABC-1234", "2026-03-01"],
        ],
        [50, 50, 70],
    )

    pdf.sub_title("4-2. 구성원")
    pdf.add_table(
        ["이름", "역할", "참여일"],
        [
            ["김민수", "owner", "2026-03-01"],
            ["이지은", "member", "2026-03-02"],
        ],
        [50, 50, 70],
    )

    pdf.sub_title("4-3. 카테고리")
    pdf.add_table(
        ["카테고리명", "아이콘", "색상"],
        [
            ["식료품", "cart", "#4CAF50"],
            ["외식", "fork", "#FF9800"],
            ["배달", "bike", "#2196F3"],
            ["카페/음료", "cup", "#9C27B0"],
            ["간식", "cookie", "#F44336"],
        ],
        [50, 50, 70],
    )

    pdf.sub_title("4-4. 지출 내역 (2026년 3월 샘플)")
    pdf.add_table(
        ["날짜", "카테고리", "금액(원)", "메모"],
        [
            ["2026-03-02", "식료품", "45,200", "이마트 장보기"],
            ["2026-03-03", "외식", "32,000", "가족 외식 (한식당)"],
            ["2026-03-05", "배달", "28,500", "치킨 배달"],
            ["2026-03-07", "카페/음료", "9,800", "스타벅스"],
            ["2026-03-08", "식료품", "67,300", "코스트코 장보기"],
            ["2026-03-10", "간식", "5,400", "편의점 간식"],
            ["2026-03-12", "외식", "55,000", "생일 외식 (이탈리안)"],
            ["2026-03-14", "배달", "19,900", "피자 배달"],
            ["2026-03-18", "식료품", "38,700", "동네 마트"],
            ["2026-03-20", "카페/음료", "12,600", "투썸플레이스"],
            ["2026-03-22", "배달", "24,000", "중식 배달"],
            ["2026-03-25", "식료품", "52,100", "이마트 장보기"],
            ["2026-03-27", "외식", "41,000", "주말 브런치"],
            ["2026-03-30", "간식", "8,200", "베이커리"],
        ],
        [30, 35, 35, 70],
    )

    pdf.sub_title("4-5. 월간 요약 (2026년 3월)")

    pdf.add_table(
        ["카테고리", "건수", "합계(원)", "비중"],
        [
            ["식료품", "4", "203,300", "46.1%"],
            ["외식", "3", "128,000", "29.0%"],
            ["배달", "3", "72,400", "16.4%"],
            ["카페/음료", "2", "22,400", "5.1%"],
            ["간식", "2", "13,600", "3.1%"],
            ["합계", "14", "439,700", "100.0%"],
        ],
        [40, 30, 50, 50],
    )

    # ─── 5. 구현 완료 현황 ───
    pdf.add_page()
    pdf.section_title("5. 구현 완료 현황")

    pdf.sub_title("완료된 기능")
    completed = [
        "구글 OAuth 로그인",
        "그룹 생성 / 초대코드 참여",
        "지출 입력 (금액, 카테고리, 날짜, 메모, 사진)",
        "지출 내역 리스트 (날짜 그룹, 카테고리/기간 필터, 삭제)",
        "대시보드 (이번 달 합계, 카테고리별 요약, 최근 5건)",
        "통계 (파이 차트, 월별 바 차트, 기간 선택)",
        "설정 (프로필, 초대코드 복사, 로그아웃)",
        "영수증 사진 업로드",
    ]
    for item in completed:
        pdf.bullet(f"[완료] {item}")

    pdf.ln(4)
    pdf.sub_title("예정된 기능")
    todo = [
        "지출 수정 기능 (현재 삭제만 가능)",
        "카테고리 추가/편집 UI",
        "PWA 설정 (모바일 홈화면 추가)",
        "영수증 AI 인식 (OCR 연동)",
        "반응형 데스크톱 레이아웃",
        "지출 입력 시 중복 제출 방지",
    ]
    for item in todo:
        pdf.bullet(f"[예정] {item}")

    # ─── 6. 데이터 구조 ───
    pdf.ln(4)
    pdf.section_title("6. 데이터 구조")

    pdf.body_text("앱에서 사용하는 주요 데이터 테이블은 다음과 같습니다.")
    pdf.ln(2)

    pdf.add_table(
        ["테이블", "주요 필드", "설명"],
        [
            ["households", "id, name, invite_code", "그룹(가구) 정보"],
            ["memberships", "household_id, user_id, role", "그룹 구성원 관리"],
            ["categories", "household_id, name, icon, color", "지출 카테고리"],
            ["expenses", "household_id, category_id, amount, memo, date", "지출 기록"],
        ],
        [35, 75, 60],
    )

    pdf.body_text(
        "모든 테이블은 행 수준 보안(RLS)이 적용되어 있으며, "
        "로그인한 사용자가 속한 그룹의 데이터에만 접근할 수 있습니다."
    )

    # ─── 출력 ───
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "밥상기록_서비스설명자료.pdf")
    pdf.output(output_path)
    print(f"PDF 생성 완료: {output_path}")


if __name__ == "__main__":
    generate()

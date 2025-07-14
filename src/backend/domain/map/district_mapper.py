# district_mapper.py

# 영문 구 이름 → 한글 구 이름
district_name_map = {
    'Dobong-gu': '도봉구',
    'Dongdaemun-gu': '동대문구',
    'Dongjak-gu': '동작구',
    'Eunpyeong-gu': '은평구',
    'Gangbuk-gu': '강북구',
    'Gangdong-gu': '강동구',
    'Gangseo-gu': '강서구',
    'Geumcheon-gu': '금천구',
    'Guro-gu': '구로구',
    'Gwanak-gu': '관악구',
    'Gwangjin-gu': '광진구',
    'Gangnam-gu': '강남구',
    'Jongno-gu': '종로구',
    'Jung-gu': '중구',
    'Jungnang-gu': '중랑구',
    'Mapo-gu': '마포구',
    'Nowon-gu': '노원구',
    'Seocho-gu': '서초구',
    'Seodaemun-gu': '서대문구',
    'Seongbuk-gu': '성북구',
    'Seongdong-gu': '성동구',
    'Songpa-gu': '송파구',
    'Yangcheon-gu': '양천구',
    'Yeongdeungpo-gu': '영등포구',
    'Yongsan-gu': '용산구'
}

# 한글 구 이름 → 영문 구 코드 (게시글 저장용)
kor_to_eng = {v: k for k, v in district_name_map.items()}

# 사용 예:
# kor_to_eng["은평구"]  → "Eunpyeong-gu"
# district_name_map["Eunpyeong-gu"] → "은평구"

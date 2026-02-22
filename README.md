# 우마무스메 트윙클 페스티벌 웹 인포

정적 페이지 기반 행사 인포 사이트입니다.

## 주요 기능
- 배치도 오버레이 클릭 모달
- 부스 검색 + 배치도 하이라이트
- A~G 라인별 부스 목록
- 모달 이미지 페이지 넘김(여러 장)
- 트위터/X, 픽시브 외부 링크

## 데이터 파일
`data/booths.json` (우선), `data/booths.csv` (fallback)

### JSON 스키마
```json
[
  {
    "code": "A1",
    "name": "부스명",
    "info": "소개글",
    "character": ["골드쉽", "맥퀸"],
    "images": ["./assets/a1-1.jpg", "./assets/a1-2.jpg"],
    "links": {
      "twitter": "https://x.com/...",
      "pixiv": "https://www.pixiv.net/users/..."
    }
  }
]
```

### CSV 헤더
```csv
code,name,character,info,image,images,twitter,pixiv
```
- `character`: `|` 구분 가능
- `images`: `|` 구분 가능

## 로컬 실행
```bash
cd /home/codex/uma-twinkle-fes-webinfo
python3 -m http.server 8080
```

## 배포
GitHub Pages 정적 배포를 권장합니다.

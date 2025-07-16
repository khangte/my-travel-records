document.addEventListener('DOMContentLoaded', function() {
    const cancelbtn = document.querySelector('.cancel-btn');
    if(cancelbtn){
        cancelbtn.addEventListener("click", () => {
            console.log("[ACTION] Cancel 버튼 클릭 → /map.html 이동");
            window.location.href="/map.html";
        })
    }

    // --- 1. 제어할 요소들을 모두 가져옵니다 ---
    const boardForm = document.getElementById('board-form');
    const imageUploadWrapper = document.querySelector('.image-upload-wrapper');
    const imageInput = document.getElementById('imageInput');
    const previewImage = document.getElementById('previewImage');
    const deleteImageButton = document.getElementById('deleteImage');
    const defaultIconPath = '/static/images/CAMERAICON.png';
    const locationSelect = document.getElementById('location'); // --- 자치구 선택
    const dateInput = document.getElementById('date'); // --- 날짜 입력 및 선택

    fetch('/api/districts')
        .then(response => {
            if (!response.ok) {
                console.log(`[ERROR] 서버 응답 실패 - 상태 코드: ${response.status}`);
                throw new Error('자치구 목록 로딩 실패');
            }
            return response.json();
        })
        .then(districts => {
            console.log("[INFO] 자치구 목록 불러오기 성공:", districts);
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district.display_name;  // "동작구"처럼 한글값
                option.textContent = district.display_name;
                locationSelect.appendChild(option);
            });
        })
        .catch(error => {
            if (error.name === 'TypeError') {
                console.log("[ERROR] 네트워크 오류 또는 서버 접속 불가:", error);
            } else if (error.message === '자치구 목록 로딩 실패') {
                console.log("[ERROR] HTTP 응답은 있었지만 성공하지 않음 (4xx/5xx)");
            } else {
                console.log("[ERROR] 알 수 없는 오류 발생:", error);
            }
            console.error("자치구 목록 로딩 오류:", error);
        });


    // 오늘 날짜 (yyyy-mm-dd 형식으로)
    function getTodayDateString() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // 날짜가 미래면 오늘로 바꾸는 함수
    function correctFutureDate() {
        const selected = new Date(dateInput.value);
        const today = new Date(getTodayDateString());

        if (selected > today) {
            console.log("[INFO] 미래 날짜 입력됨 → 오늘 날짜로 변경");
            dateInput.value = getTodayDateString();
        }
    }

    // 날짜 선택 후 포커스 잃을 때 확인
    dateInput.addEventListener('blur', correctFutureDate);

    // 수동으로 날짜 선택할 때도 반영
    dateInput.addEventListener('change', correctFutureDate);

    // --- 2. 이미지 미리보기 관련 기능 ---
    imageUploadWrapper.addEventListener('click', function(event) {
        if (event.target !== deleteImageButton) {
            imageInput.click();
        }
    });

    imageInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            console.log("[INFO] 이미지 선택됨:", file.name);
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                deleteImageButton.style.display = 'block';
                imageUploadWrapper.classList.add('uploaded');
            }
            reader.readAsDataURL(file);
        }
    });

    deleteImageButton.addEventListener('click', function() {
        console.log("[ACTION] 이미지 삭제");
        previewImage.src = defaultIconPath;
        imageInput.value = '';
        deleteImageButton.style.display = 'none';
        imageUploadWrapper.classList.remove('uploaded');
    });

    // --- 3. 폼 제출 관련 기능 ---
    boardForm.addEventListener('submit', function(event) {
        event.preventDefault(); // 기본 폼 제출(새로고침) 동작을 막습니다.

        const token = localStorage.getItem('access_token');
        if (!token) {
            console.log("[ERROR] 로그인 토큰 없음 → /login.html 이동");
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
            return;
        }

        const formData = new FormData(boardForm);
        // html 대신 유효성 검사
        const file = imageInput.files[0];
        if (!file) {
            console.log("[ERROR] 이미지 누락");
            alert("이미지를 선택해주세요.");
            submitButton.disabled = false;
            submitButton.textContent = 'Post';
            return;
        }
        console.log("🔍 선택한 이미지:", file);

        // [개선] 버튼을 비활성화해서 중복 제출을 막습니다.
        const submitButton = boardForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Posting...';

        console.log("[INFO] 게시글 폼 제출 시작");
        console.log("  제목:", formData.get("title"));
        console.log("  자치구:", formData.get("district_code"));
        console.log("  날짜:", formData.get("date"));

        fetch('/api/board/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        })
        .then(response => {
            // 서버 응답이 리다이렉션일 경우, 해당 주소로 페이지를 이동시킵니다.
            if (response.redirected) {
                console.log("[INFO] 리다이렉션 →", response.url);
                window.location.href = response.url;
                return; // 리다이렉션 후에는 더 이상 처리하지 않음
            }
            
            // 응답이 실패(2xx 상태코드가 아님)했을 경우
            if (!response.ok) {
                return response.json().then(errorData => {
                    if (response.status === 422) {
                        console.log("[ERROR 422] 필드 누락 또는 유효성 오류", errorData);
                    } else if (response.status === 404) {
                        console.log("[ERROR 404] 존재하지 않는 리소스", errorData);
                    } else {
                        console.log(`[ERROR ${response.status}] 서버 처리 오류`, errorData);
                    }
                    return Promise.reject(errorData);
                });
            }
            
            // 성공적인 응답 처리 (예: 성공 메시지 후 페이지 이동)
            // 성공 후 이동할 페이지가 있다면 여기에 추가
            // window.location.href = '/board/list.html'; 
            return response.json(); // 성공 데이터를 다음 .then()으로 넘길 수 있음
        })
        .then(data => {
                console.log("[SUCCESS] 게시글 생성 완료:", data);
        })
        .catch(error => {
            // Promise.reject로 넘어온 에러 또는 네트워크 에러를 여기서 처리합니다.
            console.log("[ERROR] 게시글 제출 실패:", error);
            alert(error.detail || '게시글 작성 중 오류가 발생했습니다.');
        })
        .finally(() => {
            // 성공/실패 여부와 관계없이 버튼을 다시 활성화 시킵니다.
            submitButton.disabled = false;
            submitButton.textContent = 'Post';
        }); 
    }); 
});


    //////////////////////////////////////////////////
    // 필요없어짐.
//    const districtNameToCode = {
//        '강남구': 'gangnam-gu',
//        '강동구': 'gangdong-gu',
//        '강북구': 'gangbuk-gu',
//        '강서구': 'gangseo-gu',
//        '관악구': 'gwanak-gu',
//        '광진구': 'gwangjin-gu',
//        '구로구': 'guro-gu',
//        '금천구': 'geumcheon-gu',
//        '노원구': 'nowon-gu',
//        '도봉구': 'dobong-gu',
//        '동대문구': 'dongdaemun-gu',
//        '동작구': 'dongjak-gu',
//        '마포구': 'mapo-gu',
//        '서대문구': 'seodaemun-gu',
//        '서초구': 'seocho-gu',
//        '성동구': 'seongdong-gu',
//        '성북구': 'seongbuk-gu',
//        '송파구': 'songpa-gu',
//        '양천구': 'yangcheon-gu',
//        '영등포구': 'yeongdeungpo-gu',
//        '용산구': 'yongsan-gu',
//        '은평구': 'eunpyeong-gu',
//        '종로구': 'jongno-gu',
//        '중구': 'jung-gu',
//        '중랑구': 'jungnang-gu'
//    };
////////  필요 없어짐 -> 목록에서 선택할때 영어로 입력됨 /////////
//        // 한글 자치구 → 영문 district_code 변환
//        const selectedDistrictName = formData.get("district_code");
//        const code = districtNameToCode[selectedDistrictName];
//        if (!code) {
//            alert("선택한 자치구의 코드 변환에 실패했습니다.");
//            return;
//        }
//        formData.set("district_code", code);
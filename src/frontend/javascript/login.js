document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const id = document.getElementById("userId").value.trim();
  const pw = document.getElementById("password").value.trim();

  // 한글, 영어, 숫자만 허용
  const allowedRegex = /^[a-zA-Z0-9]+$/;
  if (!allowedRegex.test(id)) {
    alert("아이디는 영어, 숫자만 입력 가능합니다.");
    return;
  }


  const body = new URLSearchParams();
  body.append("username", id);
  body.append("password", pw);

  try {
    const response = await fetch("/api/user/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body
    });

    if (response.ok) {
      const data = await response.json();
      alert("성공적으로 로그인되었습니다.");
      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/main.html";
    } else {
      const err = await response.json();
      alert(err.detail || "로그인 실패");
    }
  } catch (error) {
    alert("서버와 연결할 수 없습니다.");
    console.error("Login Error:", error);
  }
});

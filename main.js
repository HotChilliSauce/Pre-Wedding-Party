import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  onValue,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFrTzMJEZMpxChJ_lsj_RdtPC87wzvI4U",
  authDomain: "pre-wedding-party.firebaseapp.com",
  databaseURL: "https://pre-wedding-party-default-rtdb.firebaseio.com",
  projectId: "pre-wedding-party",
  storageBucket: "pre-wedding-party.firebaseapp.com",
  messagingSenderId: "642438297363",
  appId: "1:642438297363:web:979d7db7511f2a4f6b4ce6",
  measurementId: "G-3HWLRVWQWC",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// RSVP 실시간 카운트 반영
const rsvpRef = ref(db, "rsvpCount");
const rsvpListRef = ref(db, "rsvpList");  // [추가] 이름 저장위해 추가
const rsvpCountSpan = document.getElementById("rsvpCount");

rsvpBtn.onclick = async function () {
  if (isRSVPed()) return; // 중복방지

  // ---- 이름 필수 입력 ----
  const rsvpNameInput = document.getElementById('rsvpName');
  const name = rsvpNameInput.value.trim();
  if (!name) {
    rsvpMsg.textContent = "이름을 입력해 주세요.";
    rsvpNameInput.focus();
    return;
  }
  // ----------------------

  // [추가] 이름을 DB에 누적 기록 (push)
  await set(ref(db, `rsvpList/${Date.now()}`), {
    name: name,
    date: new Date().toISOString(),
  });

  // 현재 카운트 받아오기
  const snap = await get(rsvpRef);
  let val = snap.val();
  if (typeof val !== "number") val = 0;
  await set(rsvpRef, val + 1);
  setRSVPed();
  updateRSVPBtn();
};

// 중복방지: localStorage 체크
function isRSVPed() {
  return localStorage.getItem("preWeddingRSVPed2026") === "yes";
}
function setRSVPed() {
  localStorage.setItem("preWeddingRSVPed2026", "yes");
}

// 페이지 로드시 버튼 상태 셋팅
function updateRSVPBtn() {
  if (isRSVPed()) {
    rsvpBtn.disabled = true;
    rsvpBtn.textContent = "참석 확인 완료";
    rsvpMsg.textContent = "이미 참석 수락하셨습니다! 고마워요 :)";
  } else {
    rsvpBtn.disabled = false;
    rsvpBtn.textContent = "초대 수락";
    rsvpMsg.textContent = "";
  }
}
updateRSVPBtn();

// 버튼 클릭 시 중복방지/카운트 증가
rsvpBtn.onclick = async function () {
  if (isRSVPed()) return; // 중복방지
  // 현재 카운트 받아오기
  const snap = await get(rsvpRef);
  let val = snap.val();
  if (typeof val !== "number") val = 0;
  await set(rsvpRef, val + 1);
  setRSVPed();
  updateRSVPBtn();
};

// dreamy-blob 배경 마우스 트래킹
document.addEventListener("mousemove", (e) => {
  const x = e.clientX / window.innerWidth;
  const y = e.clientY / window.innerHeight;
  document.querySelectorAll(".blob").forEach((blob, i) => {
    const speed = (i + 1) * 18;
    blob.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
  });
});

// 방명록 모달 열기/닫기
const guestbookModal = document.getElementById("guestbookModal");
const openGuestbookBtn = document.getElementById("openGuestbook");
const closeGuestbookBtn = document.getElementById("closeGuestbook");

openGuestbookBtn.onclick = () => {
  guestbookModal.classList.add("active");
  loadGuestbook();
};

closeGuestbookBtn.onclick = () => {
  guestbookModal.classList.remove("active");
};

// 모달 배경 클릭시 닫기
guestbookModal.onclick = (e) => {
  if (e.target === guestbookModal) {
    guestbookModal.classList.remove("active");
  }
};

// 방명록 작성
const guestbookForm = document.getElementById("guestbookForm");
const guestbookList = document.getElementById("guestbookList");

guestbookForm.onsubmit = async (e) => {
  e.preventDefault();

  const name = document.getElementById("guestName").value.trim();
  const message = document.getElementById("guestMessage").value;

  if (!name || !message) return;

  // Firebase에 저장
  const guestbookRef = ref(db, "guestbook");
  const newEntryRef = ref(db, `guestbook/${Date.now()}`);

  await set(newEntryRef, {
    name: name,
    message: message,
    timestamp: Date.now(),
  });

  // 폼 초기화
  guestbookForm.reset();

  // 방명록 목록 새로고침
  loadGuestbook();
};

// 방명록 불러오기
async function loadGuestbook() {
  try {
    // Firebase Query로 timestamp 기준 최신 100개 조회
    const guestbookQuery = query(
      ref(db, "guestbook"),
      orderByChild("timestamp"),
      limitToLast(100)
    );
    
    const snapshot = await get(guestbookQuery);

    guestbookList.innerHTML = "";

    if (!snapshot.exists()) {
      guestbookList.innerHTML =
        '<p style="text-align:center; color:rgba(255,255,255,0.4); padding:2rem;">아직 작성된 방명록이 없습니다.</p>';
      return;
    }

    const entries = [];
    snapshot.forEach((child) => {
      entries.push({ id: child.key, ...child.val() });
    });

    // timestamp 기준으로 명시적 정렬 (최신순 = 내림차순)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    entries.forEach((entry) => {
      const date = new Date(entry.timestamp);
      const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

      const item = document.createElement("div");
      item.className = "guestbook-item";
      item.innerHTML = `
        <div class="guestbook-item-name">${entry.name}</div>
        <div class="guestbook-item-message">${entry.message}</div>
        <div class="guestbook-item-date">${dateStr}</div>
      `;
      guestbookList.appendChild(item);
    });
  } catch (error) {
    console.error("방명록 로드 에러:", error);
    // 에러 발생시 기본 방식으로 폴백
    const guestbookRef = ref(db, "guestbook");
    const snapshot = await get(guestbookRef);

    guestbookList.innerHTML = "";

    if (!snapshot.exists()) {
      guestbookList.innerHTML =
        '<p style="text-align:center; color:rgba(255,255,255,0.4); padding:2rem;">아직 작성된 방명록이 없습니다.</p>';
      return;
    }

    const entries = [];
    snapshot.forEach((child) => {
      entries.push({ id: child.key, ...child.val() });
    });

    // 클라이언트에서 정렬 (최신순 = 내림차순)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    entries.forEach((entry) => {
      const date = new Date(entry.timestamp);
      const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

      const item = document.createElement("div");
      item.className = "guestbook-item";
      item.innerHTML = `
        <div class="guestbook-item-name">${entry.name}</div>
        <div class="guestbook-item-message">${entry.message}</div>
        <div class="guestbook-item-date">${dateStr}</div>
      `;
      guestbookList.appendChild(item);
    });
  }
}

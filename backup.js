const AUTO_BACKUP_KEY = "pistachio_auto_backup";
const MANUAL_BACKUP_BASE_NAME = "pistachio-ledger-backup";

let isManualBackupDownloading = false;
let isRestoreRunning = false;

//////////////////////////////////////
// تبدیل اعداد فارسی/عربی به انگلیسی
//////////////////////////////////////
function toEnglishDigits(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}

//////////////////////////////////////
// دریافت تاریخ شمسی برای نام فایل
//////////////////////////////////////
function getJalaliDateForFilename() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(now);

  let year = "";
  let month = "";
  let day = "";

  parts.forEach((part) => {
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") day = part.value;
  });

  year = toEnglishDigits(year).padStart(4, "0");
  month = toEnglishDigits(month).padStart(2, "0");
  day = toEnglishDigits(day).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

//////////////////////////////////////
// ساخت نام فایل بکاپ دستی
//////////////////////////////////////
function getManualBackupFilename() {
  return `${MANUAL_BACKUP_BASE_NAME}-${getJalaliDateForFilename()}.json`;
}

//////////////////////////////////////
// دانلود بکاپ دستی
//////////////////////////////////////
async function downloadBackup() {
  if (isRestoreRunning) return;
  if (isManualBackupDownloading) return;

  isManualBackupDownloading = true;

  try {
    const data = await getBackupData();
    const filename = getManualBackupFilename();

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    alert("فایل پشتیبان با موفقیت دانلود شد:\n" + filename);
  } catch (error) {
    console.error("Backup Download Error:", error);
    alert("خطا در دانلود فایل پشتیبان");
  } finally {
    setTimeout(() => {
      isManualBackupDownloading = false;
    }, 1000);
  }
}

//////////////////////////////////////
// نرمال‌سازی ساختار بکاپ
//////////////////////////////////////
function normalizeBackupPayload(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  // حالت بکاپ خودکار:
  // { savedAt, data: { customers, transactions, ... } }
  if (
    parsed.data &&
    typeof parsed.data === "object" &&
    Array.isArray(parsed.data.customers) &&
    Array.isArray(parsed.data.transactions)
  ) {
    return parsed.data;
  }

  // حالت بکاپ دستی:
  // { exportedAt, version, customers, transactions }
  if (
    Array.isArray(parsed.customers) &&
    Array.isArray(parsed.transactions)
  ) {
    return parsed;
  }

  return null;
}

//////////////////////////////////////
// اجرای عملیات ریستور روی دیتابیس
//////////////////////////////////////
async function applyBackupDataToDatabase(data) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["transactions", "customers"], "readwrite");

    const transactionStore = tx.objectStore("transactions");
    const customerStore = tx.objectStore("customers");

    const clearTransactionsRequest = transactionStore.clear();
    const clearCustomersRequest = customerStore.clear();

    clearTransactionsRequest.onerror = function () {
      reject(new Error("خطا در پاک‌سازی تراکنش‌ها"));
    };

    clearCustomersRequest.onerror = function () {
      reject(new Error("خطا در پاک‌سازی مشتری‌ها"));
    };

    clearTransactionsRequest.onsuccess = function () {
      clearCustomersRequest.onsuccess = function () {
        try {
          if (Array.isArray(data.customers)) {
            data.customers.forEach((customer) => {
              customerStore.put(customer);
            });
          }

          if (Array.isArray(data.transactions)) {
            data.transactions.forEach((transaction) => {
              transactionStore.put(transaction);
            });
          }
        } catch (error) {
          reject(error);
        }
      };
    };

    tx.oncomplete = function () {
      resolve(true);
    };

    tx.onerror = function () {
      reject(tx.error || new Error("خطا در بازیابی اطلاعات"));
    };

    tx.onabort = function () {
      reject(tx.error || new Error("تراکنش بازیابی متوقف شد"));
    };
  });
}

//////////////////////////////////////
// بازیابی از فایل
//////////////////////////////////////
async function restoreBackupFromFile(file) {
  if (!file) return;
  if (isRestoreRunning) return;

  isRestoreRunning = true;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const data = normalizeBackupPayload(parsed);

    if (
      !data ||
      !Array.isArray(data.customers) ||
      !Array.isArray(data.transactions)
    ) {
      alert("ساختار فایل بکاپ معتبر نیست");
      return;
    }

    await applyBackupDataToDatabase(data);
    await saveAutoBackup();

    alert("بازیابی اطلاعات با موفقیت انجام شد");
    location.reload();
  } catch (error) {
    console.error("Restore Backup From File Error:", error);
    alert("خطا در بازیابی فایل پشتیبان");
  } finally {
    const fileInput = document.getElementById("fileInput");

    if (fileInput) {
      fileInput.value = "";
    }

    isRestoreRunning = false;
  }
}

//////////////////////////////////////
// ذخیره بکاپ خودکار
//////////////////////////////////////
async function saveAutoBackup() {
  try {
    const data = await getBackupData();

    const backupObject = {
      savedAt: new Date().toISOString(),
      data: data
    };

    localStorage.setItem(
      AUTO_BACKUP_KEY,
      JSON.stringify(backupObject)
    );

    console.log("Auto Backup Saved");
  } catch (error) {
    console.error("Auto Backup Error:", error);
  }
}

//////////////////////////////////////
// بررسی وجود بکاپ خودکار
//////////////////////////////////////
function hasAutoBackup() {
  return localStorage.getItem(AUTO_BACKUP_KEY) !== null;
}

//////////////////////////////////////
// دریافت بکاپ خودکار
//////////////////////////////////////
function getAutoBackup() {
  const raw = localStorage.getItem(AUTO_BACKUP_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Get Auto Backup Parse Error:", error);
    return null;
  }
}

//////////////////////////////////////
// بازیابی بکاپ خودکار
//////////////////////////////////////
async function restoreAutoBackup() {
  if (isRestoreRunning) return;

  isRestoreRunning = true;

  try {
    const backup = getAutoBackup();

    if (!backup || !backup.data) {
      alert("بکاپ خودکار معتبری پیدا نشد");
      return;
    }

    const data = normalizeBackupPayload(backup);

    if (
      !data ||
      !Array.isArray(data.customers) ||
      !Array.isArray(data.transactions)
    ) {
      alert("ساختار بکاپ خودکار معتبر نیست");
      return;
    }

    await applyBackupDataToDatabase(data);

    alert("بازیابی بکاپ خودکار با موفقیت انجام شد");
    location.reload();
  } catch (error) {
    console.error("Restore Auto Backup Error:", error);
    alert("خطا در بازیابی بکاپ خودکار");
  } finally {
    isRestoreRunning = false;
  }
}

//////////////////////////////////////
// بررسی خالی بودن دیتابیس
//////////////////////////////////////
async function isDatabaseEmpty() {
  const transactions = await getAllTransactions();
  const customers = await getAllCustomers();

  return transactions.length === 0 && customers.length === 0;
}

//////////////////////////////////////
// پیشنهاد بازیابی بکاپ خودکار
//////////////////////////////////////
async function checkAutoRestore() {
  const empty = await isDatabaseEmpty();

  if (!empty) return;
  if (!hasAutoBackup()) return;

  const backup = getAutoBackup();

  if (!backup || !backup.savedAt) return;

  const date = new Date(backup.savedAt);

  const confirmRestore = confirm(
    "یک بکاپ خودکار پیدا شد (" +
    date.toLocaleString("fa-IR") +
    ").\nآیا می‌خواهید بازیابی شود؟"
  );

  if (confirmRestore) {
    await restoreAutoBackup();
  }
}

//////////////////////////////////////
// اتصال عملیات دیتابیس به اتوبکاپ
//////////////////////////////////////
async function addTransactionWithBackup(data) {
  await addTransaction(data);
  await saveAutoBackup();
}

async function deleteTransactionWithBackup(id) {
  await deleteTransaction(id);
  await saveAutoBackup();
}

async function addCustomerWithBackup(data) {
  await addCustomer(data);
  await saveAutoBackup();
}

async function updateCustomerWithBackup(id, data) {
  await updateCustomer(id, data);
  await saveAutoBackup();
}

async function deleteCustomerWithBackup(id) {
  await deleteCustomer(id);
  await saveAutoBackup();
}

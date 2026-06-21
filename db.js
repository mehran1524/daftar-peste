const DB_NAME = "pistachioLedgerDB";
const TRANSACTIONS_STORE = "transactions";
const CUSTOMERS_STORE = "customers";
const DB_VERSION = 3;

/* =========================
   DATABASE
========================= */

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      let transactionStore;

      if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        transactionStore = db.createObjectStore(TRANSACTIONS_STORE, {
          keyPath: "id",
          autoIncrement: true
        });
        transactionStore.createIndex("type", "type", { unique: false });
        transactionStore.createIndex("createdAt", "createdAt", { unique: false });
      } else {
        transactionStore = event.target.transaction.objectStore(TRANSACTIONS_STORE);
      }

      if (!transactionStore.indexNames.contains("customerId")) {
        transactionStore.createIndex("customerId", "customerId", { unique: false });
      }

      if (!db.objectStoreNames.contains(CUSTOMERS_STORE)) {
        const customerStore = db.createObjectStore(CUSTOMERS_STORE, {
          keyPath: "id",
          autoIncrement: true
        });
        customerStore.createIndex("name", "name", { unique: false });
        customerStore.createIndex("phone", "phone", { unique: false });
        customerStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("خطا در باز کردن دیتابیس");
  });
}

/* =========================
   TRANSACTIONS
========================= */

async function addTransaction(transaction) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSACTIONS_STORE, "readwrite");
    const store = tx.objectStore(TRANSACTIONS_STORE);

    const normalized = {
      ...transaction,
      customerId: transaction.customerId ? Number(transaction.customerId) : null
    };

    const request = store.add(normalized);

    request.onsuccess = async () => {
      if (typeof saveAutoBackup === "function") {
        await saveAutoBackup();
      }
      resolve(true);
    };

    request.onerror = () => reject("خطا در ذخیره تراکنش");
  });
}

async function getAllTransactions() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSACTIONS_STORE, "readonly");
    const store = tx.objectStore(TRANSACTIONS_STORE);

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("خطا در خواندن تراکنش‌ها");
  });
}

async function getTransactionsByCustomer(customerId) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSACTIONS_STORE, "readonly");
    const store = tx.objectStore(TRANSACTIONS_STORE);
    const index = store.index("customerId");

    const request = index.getAll(Number(customerId));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("خطا در دریافت تراکنش‌های مشتری");
  });
}

async function deleteTransaction(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSACTIONS_STORE, "readwrite");
    const store = tx.objectStore(TRANSACTIONS_STORE);

    const request = store.delete(Number(id));

    request.onsuccess = async () => {
      if (typeof saveAutoBackup === "function") {
        await saveAutoBackup();
      }
      resolve(true);
    };

    request.onerror = () => reject("خطا در حذف تراکنش");
  });
}

/* =========================
   CUSTOMERS
========================= */

async function addCustomer(customer) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUSTOMERS_STORE, "readwrite");
    const store = tx.objectStore(CUSTOMERS_STORE);

    const normalized = {
      name: customer.name ? customer.name.trim() : "",
      phone: customer.phone ? customer.phone.trim() : "",
      createdAt: customer.createdAt || new Date().toISOString()
    };

    if (!normalized.name) {
      reject("نام مشتری الزامی است");
      return;
    }

    const request = store.add(normalized);

    request.onsuccess = async () => {
      if (typeof saveAutoBackup === "function") {
        await saveAutoBackup();
      }
      resolve(true);
    };

    request.onerror = () => reject("خطا در ذخیره مشتری");
  });
}

async function getAllCustomers() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUSTOMERS_STORE, "readonly");
    const store = tx.objectStore(CUSTOMERS_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      const customers = request.result.sort((a, b) =>
        a.name.localeCompare(b.name, "fa")
      );
      resolve(customers);
    };

    request.onerror = () => reject("خطا در خواندن مشتریان");
  });
}
async function updateCustomer(id, data) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUSTOMERS_STORE, "readwrite");
    const store = tx.objectStore(CUSTOMERS_STORE);

    const getRequest = store.get(Number(id));

    getRequest.onsuccess = () => {
      const customer = getRequest.result;

      if (!customer) {
        reject("مشتری پیدا نشد");
        return;
      }

      customer.name = data.name ? data.name.trim() : customer.name;
      customer.phone = data.phone ? data.phone.trim() : customer.phone;

      const updateRequest = store.put(customer);

      updateRequest.onsuccess = async () => {
        if (typeof saveAutoBackup === "function") {
          await saveAutoBackup();
        }
        resolve(true);
      };

      updateRequest.onerror = () => reject("خطا در بروزرسانی مشتری");
    };

    getRequest.onerror = () => reject("خطا در خواندن مشتری");
  });
}


async function deleteCustomer(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUSTOMERS_STORE, "readwrite");
    const store = tx.objectStore(CUSTOMERS_STORE);

    const request = store.delete(Number(id));

    request.onsuccess = async () => {
      if (typeof saveAutoBackup === "function") {
        await saveAutoBackup();
      }
      resolve(true);
    };

    request.onerror = () => reject("خطا در حذف مشتری");
  });
}

/* =========================
   BACKUP DATA PROVIDER
   فقط آماده‌سازی داده برای backup.js
========================= */

async function getBackupData() {
  const transactions = await getAllTransactions();
  const customers = await getAllCustomers();

  return {
    exportedAt: new Date().toISOString(),
    version: DB_VERSION,
    customers,
    transactions
  };
}

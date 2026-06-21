import {
    formatDisplayNumber,
    parseInputNumber,
    applyPersianFormatting
} from "./utils.js";

const form = document.getElementById("transactionForm");
const transactionList = document.getElementById("transactionList");
const buyTodayEl = document.getElementById("buyToday");
const sellTodayEl = document.getElementById("sellToday");
const balanceEl = document.getElementById("balance");

const typeSelect = document.getElementById("type");
const pistachioTypeSelect = document.getElementById("pistachioType");
const weightInput = document.getElementById("weight");
const priceInput = document.getElementById("pricePerKilo");
const amountInput = document.getElementById("amount");
const calcSection = document.getElementById("calcSection");
const ounceInput = document.getElementById("ounce");
const dahanbastInput = document.getElementById("dahanbast");
const bagCountInput = document.getElementById("bagCount");
const customerSelect = document.getElementById("customerSelect");
const paidAmountInput = document.getElementById("paidAmount");

const totalAmountGroup = document.getElementById("totalAmountGroup");

const todayDateEl = document.getElementById("todayDate");
const liveClockEl = document.getElementById("liveClock");

const reportModal = document.getElementById("reportModal");
const openReportBtn = document.getElementById("openReportBtn");
const closeReportBtn = document.getElementById("closeReportBtn");
const generateReportBtn = document.getElementById("generateReportBtn");
const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");
const reportResults = document.getElementById("reportResults");

const paidAmountLabel = document.getElementById("paidAmountLabel");

/* ===============================
   محدودیت نسخه آزمایشی
=============================== */

const TRIAL_LIMIT = 40;
const limitInfo = document.getElementById("limitInfo");

/* =============================== */

function updatePaidLabel() {
    if (!paidAmountLabel) return;

    if (typeSelect.value === "buy" || typeSelect.value === "debt") {
        paidAmountLabel.textContent = "پرداخت نقدی";
    } else if (typeSelect.value === "sell" || typeSelect.value === "credit") {
        paidAmountLabel.textContent = "دریافت نقدی";
    } else {
        paidAmountLabel.textContent = "مبلغ نقدی";
    }
}

function updateDateTime() {
    if (!todayDateEl || !liveClockEl) return;

    const now = new Date();
    const weekday = now.toLocaleDateString("fa-IR", { weekday: "long" });
    const day = now.toLocaleDateString("fa-IR", { day: "numeric" });
    const month = now.toLocaleDateString("fa-IR", { month: "long" });
    const year = now.toLocaleDateString("fa-IR", { year: "numeric" });

    todayDateEl.textContent = `${weekday} ${day} ${month} ${year}`;

    liveClockEl.textContent = now.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

setInterval(updateDateTime, 1000);
updateDateTime();

async function loadCustomerDropdown() {
    if (typeof getAllCustomers !== "function" || !customerSelect) return;

    const customers = await getAllCustomers();
    customerSelect.innerHTML = '<option value="">مشتری محترم</option>';

    customers.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name + (c.phone ? ` (${c.phone})` : "");
        customerSelect.appendChild(opt);
    });
}

function calculateTotal() {
    if (typeSelect.value === "buy" || typeSelect.value === "sell") {
        const weight = parseInputNumber(weightInput.value);
        const price = parseInputNumber(priceInput.value);

        const total = weight * price;

        amountInput.dataset.rawValue = total;
        amountInput.value = total > 0 ? total.toLocaleString("en-US") : "";

        applyPersianFormatting();
    }
}

weightInput.addEventListener("input", calculateTotal);

priceInput.addEventListener("input", function (e) {
    const raw = parseInputNumber(e.target.value);

    if (raw !== 0) {
        e.target.value = raw.toLocaleString("en-US");
    }

    calculateTotal();
});

paidAmountInput.addEventListener("input", function () {
    const raw = parseInputNumber(this.value);

    if (raw !== 0) {
        this.value = raw.toLocaleString("en-US");
    }
});

typeSelect.addEventListener("change", function () {
    updatePaidLabel();

    if (this.value === "debt" || this.value === "credit") {
        calcSection.style.display = "none";
        totalAmountGroup.style.display = "none";
    } else {
        calcSection.style.display = "block";
        totalAmountGroup.style.display = "block";
        calculateTotal();
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    /* ===============================
       بررسی محدودیت نسخه آزمایشی
    =============================== */

    const allItems = await getAllTransactions();
    const tradeItems = allItems.filter(
        t => t.type === "buy" || t.type === "sell"
    );

    if (tradeItems.length >= TRIAL_LIMIT) {
        alert("ظرفیت نسخه آزمایشی (۴۰ معامله) تکمیل شده است.\nبرای فعال‌سازی نسخه کامل تماس بگیرید.");
        return;
    }

    /* =============================== */

    const type = typeSelect.value;
    let amount = 0;

    const paidAmount = parseInputNumber(paidAmountInput?.value);
    const customerId = customerSelect.value ? Number(customerSelect.value) : null;

    if (type === "buy" || type === "sell") {
        amount = parseInputNumber(amountInput.value);

        if (type === "sell") amount = -amount;
    } else {
        amount = paidAmount;

        if (type === "debt") amount = -amount;
    }

    if (!amount && !paidAmount) {
        alert("لطفاً مبلغ معتبر وارد کنید");
        return;
    }

    const transaction = {
        type,
        amount,
        customerId,
        pistachioType: (type === "buy" || type === "sell") ? pistachioTypeSelect.value : null,
        weight: parseInputNumber(weightInput.value) || null,
        pricePerKilo: parseInputNumber(priceInput.value) || null,
        bagCount: parseInputNumber(bagCountInput.value) || null,
        ounce: parseInputNumber(ounceInput.value) || null,
        dahanbast: parseInputNumber(dahanbastInput.value) || null,
        description: document.getElementById("description").value,
        createdAt: new Date().toISOString()
    };

    if (typeof addTransactionWithBackup === "function") {
        await addTransactionWithBackup(transaction);
    } else {
        await addTransaction(transaction);

        if (typeof saveAutoBackup === "function") {
            await saveAutoBackup();
        }
    }

    if ((type === "buy" || type === "sell") && paidAmount > 0) {
        const settlementAmount = (type === "sell") ? paidAmount : -paidAmount;

        const settlementTransaction = {
            type: type === "sell" ? "credit" : "debt",
            amount: settlementAmount,
            customerId,
            description: "پرداخت هنگام معامله",
            createdAt: new Date().toISOString()
        };

        if (typeof addTransactionWithBackup === "function") {
            await addTransactionWithBackup(settlementTransaction);
        } else {
            await addTransaction(settlementTransaction);

            if (typeof saveAutoBackup === "function") {
                await saveAutoBackup();
            }
        }
    }

    form.reset();

    calcSection.style.display = "block";
    totalAmountGroup.style.display = "block";

    updatePaidLabel();

    await loadCustomerDropdown();
    await loadTransactions();
});

/* ===================================================== */

function labelType(type) {
    const labels = {
        buy: "خرید پسته",
        sell: "فروش پسته",
        debt: "پرداخت نقدی",
        credit: "دریافت نقدی"
    };
    return labels[type] || type;
}

/* ===================================================== */

async function loadTransactions() {

    const items = await getAllTransactions();

    /* ===============================
       نمایش تعداد باقی‌مانده
    =============================== */

    const tradeItems = items.filter(
        t => t.type === "buy" || t.type === "sell"
    );

    const remaining = TRIAL_LIMIT - tradeItems.length;

    if (limitInfo) {
        if (remaining > 0) {
            limitInfo.textContent = `تراکنش باقی‌مانده تا پایان نسخه آزمایشی: ${remaining}`;
        } else {
            limitInfo.textContent = "نسخه آزمایشی به پایان رسیده است";
        }

        if (remaining <= 5) {
            limitInfo.style.color = "red";
        }
    }

    /* =============================== */

    let customersList = [];

    if (typeof getAllCustomers === "function") {
        customersList = await getAllCustomers();
    }

    transactionList.innerHTML = "";

    let buyToday = 0;
    let sellToday = 0;
    let dailyTotal = 0;

    const todayStr = new Date().toLocaleDateString("fa-IR");

    items.slice().reverse().forEach(item => {

        const itemDate = new Date(item.createdAt);
        const itemDateStr = itemDate.toLocaleDateString("fa-IR");
        const isToday = (itemDateStr === todayStr);

        const li = document.createElement("li");
        li.className = "transaction-item";

        const colorClass = item.amount < 0 ? "text-red" : "text-green";
        const sign = item.amount < 0 ? "" : "+";

        let customerNameLabel = "";

        if (item.customerId) {
            const c = customersList.find(x => x.id === item.customerId);
            if (c) customerNameLabel = ` [مشتری: ${c.name}]`;
        } else {
            customerNameLabel = " [مشتری محترم]";
        }

        let details = "";

        if (item.pistachioType) details += ` | پسته ${item.pistachioType}`;
        if (item.weight) details += ` | ${formatDisplayNumber(item.weight)} کیلو`;
        if (item.pricePerKilo) details += ` (فی: ${formatDisplayNumber(item.pricePerKilo)})`;

        li.innerHTML = `
            <div class="item-info">
                <strong>${labelType(item.type)}${customerNameLabel}</strong>
                <span class="item-desc">${item.description || ""} ${details}</span>
                <small style="display:block;color:#888;font-size:10px">
                    ${itemDate.toLocaleTimeString("fa-IR")}
                </small>
            </div>
            <div class="item-amount ${colorClass}">
                ${sign}${formatDisplayNumber(Math.abs(item.amount))}
            </div>
        `;

        transactionList.appendChild(li);

        if (isToday) {
            if (item.type === "buy") buyToday += Math.abs(item.amount);
            if (item.type === "sell") sellToday += Math.abs(item.amount);
            dailyTotal += Number(item.amount);
        }

    });

    buyTodayEl.textContent = formatDisplayNumber(buyToday);
    sellTodayEl.textContent = formatDisplayNumber(sellToday);

    if (balanceEl) {
        balanceEl.textContent = formatDisplayNumber(dailyTotal);
        balanceEl.style.color = dailyTotal >= 0 ? "#2e7d32" : "#d32f2f";
    }

    updateReportDates(items);
}

/* بقیه کد بدون هیچ تغییری ادامه دارد */

import {
    formatDisplayNumber,
    parseInputNumber,
    applyPersianFormatting
} from "./utils.js";

const TRIAL_LIMIT = 20;
const LIMITED_TRANSACTION_TYPES = ["buy", "sell", "debt", "credit"];

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
const limitInfo = document.getElementById("limitInfo");
if (limitInfo) {
    limitInfo.style.display = "block";
    limitInfo.style.textAlign = "center";
    limitInfo.style.padding = "10px";
    limitInfo.style.margin = "10px 0";
    limitInfo.style.border = "1px solid #ddd";
    limitInfo.style.borderRadius = "8px";
    limitInfo.style.backgroundColor = "#fdfdfd";
}

function normalizeTransactions(transactions) {
    if (Array.isArray(transactions)) return transactions;
    if (!transactions || typeof transactions !== "object") return [];
    return Object.values(transactions);
}

function getTrialTransactionCount(transactions) {
    const items = normalizeTransactions(transactions);

    return items.filter(item => {
        if (!item) return false;

        const type = item.type;
        const description = String(item.description || "").trim();

        return (
            LIMITED_TRANSACTION_TYPES.includes(type) &&
            description !== "پرداخت هنگام معامله"
        );
    }).length;
}

function getTrialRemainingCount(transactions) {
    const usedCount = getTrialTransactionCount(transactions);
    return Math.max(TRIAL_LIMIT - usedCount, 0);
}

function updateLimitInfo(transactions) {
    if (!limitInfo) return;

    const usedCount = getTrialTransactionCount(transactions);
    const remaining = Math.max(TRIAL_LIMIT - usedCount, 0);

    if (remaining > 0) {
        limitInfo.textContent = `تعداد معامله‌های باقی‌مانده نسخه آزمایشی: ${remaining} از ${TRIAL_LIMIT}`;
    } else {
        limitInfo.textContent = "ظرفیت نسخه آزمایشی تکمیل شده است";
    }

    limitInfo.style.color = remaining <= 5 ? "#d32f2f" : "#2e7d32";
    limitInfo.style.fontWeight = "bold";
}

async function checkTrialLimitBeforeSubmit() {
    const allItems = await getAllTransactions();
    const remaining = getTrialRemainingCount(allItems);

    updateLimitInfo(allItems);

    if (remaining <= 0) {
        alert("ظرفیت نسخه آزمایشی (۴۰ معامله) تکمیل شده است");
        return false;
    }

    return true;
}

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

    const canSubmit = await checkTrialLimitBeforeSubmit();

    if (!canSubmit) {
        return;
    }

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

    const allItems = await getAllTransactions();
    const usedCount = getTrialTransactionCount(allItems);

    updateLimitInfo(allItems);

    if (usedCount >= TRIAL_LIMIT) {
        alert("ظرفیت نسخه آزمایشی (۴۰ معامله) تکمیل شده است");
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

function labelType(type) {
    const labels = {
        buy: "خرید پسته",
        sell: "فروش پسته",
        debt: "پرداخت نقدی",
        credit: "دریافت نقدی"
    };
    return labels[type] || type;
}

function getDateValue(dateString) {
    if (!dateString) return "";

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateLabel(dateValue) {
    if (!dateValue) return "";

    const d = new Date(`${dateValue}T00:00:00`);
    if (isNaN(d.getTime())) return "";

    return d.toLocaleDateString("fa-IR");
}

function updateReportDates(transactions) {
    if (!fromDateInput || !toDateInput) return;

    const items = normalizeTransactions(transactions);

    const uniqueDates = [...new Set(
        items
            .map(t => getDateValue(t.createdAt))
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    const fromIsSelect = fromDateInput.tagName === "SELECT";
    const toIsSelect = toDateInput.tagName === "SELECT";

    if (uniqueDates.length === 0) {
        if (fromIsSelect) {
            fromDateInput.innerHTML = '<option value=""></option>';
        } else {
            fromDateInput.value = "";
            fromDateInput.removeAttribute("min");
            fromDateInput.removeAttribute("max");
        }

        if (toIsSelect) {
            toDateInput.innerHTML = '<option value=""></option>';
        } else {
            toDateInput.value = "";
            toDateInput.removeAttribute("min");
            toDateInput.removeAttribute("max");
        }

        return;
    }

    const oldestDate = uniqueDates[0];
    const newestDate = uniqueDates[uniqueDates.length - 1];

    if (fromIsSelect) {
        fromDateInput.innerHTML = "";
        uniqueDates.forEach(dateValue => {
            const option = document.createElement("option");
            option.value = dateValue;
            option.textContent = getDateLabel(dateValue);
            fromDateInput.appendChild(option);
        });
    } else {
        fromDateInput.min = oldestDate;
        fromDateInput.max = newestDate;
    }

    if (toIsSelect) {
        toDateInput.innerHTML = "";
        uniqueDates.forEach(dateValue => {
            const option = document.createElement("option");
            option.value = dateValue;
            option.textContent = getDateLabel(dateValue);
            toDateInput.appendChild(option);
        });
    } else {
        toDateInput.min = oldestDate;
        toDateInput.max = newestDate;
    }

    fromDateInput.value = oldestDate;
    toDateInput.value = newestDate;
}

async function loadTransactions() {
    const rawItems = await getAllTransactions();
    const items = normalizeTransactions(rawItems);

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

    updateLimitInfo(items);
    updateReportDates(items);
}

if (openReportBtn) {
    openReportBtn.onclick = async () => {
        const items = await getAllTransactions();
        updateReportDates(items);

        if (reportResults) {
            reportResults.style.display = "none";
        }

        if (reportModal) {
            reportModal.style.display = "block";
        }
    };
}

if (closeReportBtn) {
    closeReportBtn.onclick = () => {
        if (reportModal) {
            reportModal.style.display = "none";
        }
    };
}

if (generateReportBtn) {
    generateReportBtn.onclick = async () => {
        const rawItems = await getAllTransactions();
        const items = normalizeTransactions(rawItems);

        const from = fromDateInput.value;
        const to = toDateInput.value;

        if (!from || !to) {
            alert("هیچ تاریخی برای گزارش ثبت نشده است");
            if (reportResults) reportResults.style.display = "none";
            return;
        }

        if (from > to) {
            alert("بازه تاریخ نامعتبر است");
            if (reportResults) reportResults.style.display = "none";
            return;
        }

        let totalBuy = 0;
        let totalSell = 0;
        let totalRangeBalance = 0;

        items.forEach(item => {
            const itemDateValue = getDateValue(item.createdAt);

            if (itemDateValue >= from && itemDateValue <= to) {
                if (item.type === "buy") totalBuy += Math.abs(item.amount);
                if (item.type === "sell") totalSell += Math.abs(item.amount);

                totalRangeBalance += Number(item.amount);
            }
        });

        const businessProfit = totalSell - totalBuy;

        document.getElementById("totalBuyRange").textContent = formatDisplayNumber(totalBuy);
        document.getElementById("totalSellRange").textContent = formatDisplayNumber(totalSell);
        document.getElementById("finalBalanceRange").textContent = formatDisplayNumber(businessProfit);

        const financialEl = document.getElementById("financialBalanceRange");
        financialEl.textContent = formatDisplayNumber(totalRangeBalance);
        financialEl.className = totalRangeBalance >= 0 ? "text-green" : "text-red";

        if (reportResults) reportResults.style.display = "block";
    };
}

/* =====================================================
   PDF معامله - دریافت آخرین معامله از دیتابیس و دانلود PDF
===================================================== */

function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function createPdfRow(label, value) {
    if (value === null || value === undefined || value === "") return "";

    return `
        <tr>
            <td class="label">${escapeHtml(label)}</td>
            <td class="value">${escapeHtml(value)}</td>
        </tr>
    `;
}

async function openPdfTrade() {
    try {
        if (typeof getAllTransactions !== "function") {
            alert("خطا: تابع دریافت تراکنش‌ها از دیتابیس پیدا نشد");
            return;
        }

        const rawItems = await getAllTransactions();
        const items = normalizeTransactions(rawItems);

        if (!items || items.length === 0) {
            alert("هیچ معامله‌ای برای ساخت PDF ثبت نشده است");
            return;
        }

        const tradeTransactions = items.filter(item =>
            item.type === "buy" || item.type === "sell"
        );

        if (tradeTransactions.length === 0) {
            alert("هیچ معامله خرید یا فروشی برای ساخت PDF ثبت نشده است");
            return;
        }

        const lastTrade = tradeTransactions[tradeTransactions.length - 1];

        let customersList = [];

        if (typeof getAllCustomers === "function") {
            customersList = await getAllCustomers();
        }

        let customerName = "مشتری محترم";
        let customerPhone = "";

        if (lastTrade.customerId) {
            const customer = customersList.find(c => c.id === lastTrade.customerId);

            if (customer) {
                customerName = customer.name || "مشتری محترم";
                customerPhone = customer.phone || "";
            }
        }

        const createdDate = new Date(lastTrade.createdAt);
        const persianDate = isNaN(createdDate.getTime())
            ? ""
            : createdDate.toLocaleDateString("fa-IR");

        const persianTime = isNaN(createdDate.getTime())
            ? ""
            : createdDate.toLocaleTimeString("fa-IR", {
                hour: "2-digit",
                minute: "2-digit"
            });

        const tradeTypeLabel = labelType(lastTrade.type);
        const amountAbs = Math.abs(Number(lastTrade.amount) || 0);

        const fileDatePart = getDateValue(lastTrade.createdAt) || "today";
        const fileName = `pdf-moamele-peste-${fileDatePart}.pdf`;

        const printableElement = document.createElement("div");
        printableElement.style.position = "fixed";
        printableElement.style.left = "-9999px";
        printableElement.style.top = "0";
        printableElement.style.width = "210mm";
        printableElement.style.background = "#ffffff";

        printableElement.innerHTML = `
            <div id="tradePdfContent" dir="rtl">
                <style>
                    #tradePdfContent {
                        width: 210mm;
                        min-height: 297mm;
                        box-sizing: border-box;
                        padding: 18mm 15mm;
                        background: #ffffff;
                        color: #222;
                        direction: rtl;
                        font-family: Tahoma, Arial, sans-serif;
                    }

                    #tradePdfContent * {
                        box-sizing: border-box;
                    }

                    .pdf-header {
                        text-align: center;
                        border: 2px solid #2e7d32;
                        border-radius: 14px;
                        padding: 14px 10px;
                        margin-bottom: 18px;
                        background: #f1f8e9;
                    }

                    .pdf-title {
                        font-size: 24px;
                        font-weight: bold;
                        color: #2e7d32;
                        margin-bottom: 8px;
                    }

                    .pdf-subtitle {
                        font-size: 15px;
                        color: #444;
                    }

                    .meta-row {
                        display: flex;
                        justify-content: space-between;
                        gap: 10px;
                        margin-bottom: 14px;
                        font-size: 13px;
                        color: #555;
                    }

                    .meta-box {
                        width: 50%;
                        border: 1px solid #ddd;
                        border-radius: 10px;
                        padding: 10px;
                        background: #fafafa;
                    }

                    .section-title {
                        background: #2e7d32;
                        color: white;
                        padding: 9px 12px;
                        border-radius: 10px;
                        margin: 16px 0 8px 0;
                        font-size: 15px;
                        font-weight: bold;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 14px;
                        direction: rtl;
                    }

                    td {
                        border: 1px solid #ddd;
                        padding: 11px 10px;
                        font-size: 14px;
                        vertical-align: middle;
                    }

                    td.label {
                        width: 35%;
                        background: #f7f7f7;
                        font-weight: bold;
                        color: #333;
                    }

                    td.value {
                        width: 65%;
                        background: #fff;
                        color: #111;
                    }

                    .amount-box {
                        margin-top: 16px;
                        border: 2px solid #2e7d32;
                        border-radius: 12px;
                        padding: 14px;
                        text-align: center;
                        background: #f1f8e9;
                    }

                    .amount-label {
                        font-size: 14px;
                        color: #555;
                        margin-bottom: 8px;
                    }

                    .amount-value {
                        font-size: 22px;
                        font-weight: bold;
                        color: #2e7d32;
                    }

                    .desc-box {
                        min-height: 55px;
                        border: 1px solid #ddd;
                        border-radius: 10px;
                        padding: 12px;
                        line-height: 1.9;
                        font-size: 14px;
                        background: #fff;
                    }

                    .signature-row {
                        display: flex;
                        justify-content: space-between;
                        gap: 25px;
                        margin-top: 42px;
                    }

                    .signature-box {
                        width: 48%;
                        height: 80px;
                        border-top: 1px solid #444;
                        text-align: center;
                        padding-top: 10px;
                        font-size: 13px;
                        color: #333;
                    }

                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        color: #777;
                        font-size: 11px;
                        border-top: 1px dashed #ccc;
                        padding-top: 12px;
                    }
                </style>

                <div class="pdf-header">
                    <div class="pdf-title">دفتر حساب پسته</div>
                    <div class="pdf-subtitle">رسید / فاکتور آخرین معامله ثبت‌شده</div>
                </div>

                <div class="meta-row">
                    <div class="meta-box">
                        <strong>تاریخ</strong>
                        ${escapeHtml(persianDate)}
                    </div>

                    <div class="meta-box">
                        <strong>ساعت</strong>
                        ${escapeHtml(persianTime)}
                    </div>
                </div>

                <div class="section-title">مشخصات معامله</div>

                <table>
                    ${createPdfRow("نوع معامله", tradeTypeLabel)}
                    ${createPdfRow("نام مشتری", customerName)}
                    ${createPdfRow("شماره تماس مشتری", customerPhone)}
                    ${createPdfRow("نوع پسته", lastTrade.pistachioType)}
                    ${createPdfRow("وزن خالص", lastTrade.weight ? `${formatDisplayNumber(lastTrade.weight)} کیلوگرم` : "")}
                    ${createPdfRow("قیمت فی", lastTrade.pricePerKilo ? `${formatDisplayNumber(lastTrade.pricePerKilo)} تومان` : "")}
                    ${createPdfRow("تعداد عدل", lastTrade.bagCount ? formatDisplayNumber(lastTrade.bagCount) : "")}
                    ${createPdfRow("اونس", lastTrade.ounce ? `${formatDisplayNumber(Number(lastTrade.ounce) + 2)} → ${formatDisplayNumber(lastTrade.ounce)}` : "")}
                    ${createPdfRow("دهن‌بست", lastTrade.dahanbast ? `${formatDisplayNumber(lastTrade.dahanbast)} درصد` : "")}
                </table>

                <div class="amount-box">
                    <div class="amount-label">مبلغ کل معامله</div>
                    <div class="amount-value">${formatDisplayNumber(amountAbs)} تومان</div>
                </div>

                <div class="section-title">شرح معامله</div>

                <div class="desc-box">
                    ${escapeHtml(lastTrade.description || "شرحی برای این معامله ثبت نشده است.")}
                </div>

                <div class="signature-row">
                    <div class="signature-box">امضا فروشنده</div>
                    <div class="signature-box">امضا خریدار</div>
                </div>

                <div class="footer">
                    این فایل به صورت خودکار توسط برنامه دفتر حساب پسته تولید شده است.
                </div>
            </div>
        `;

        document.body.appendChild(printableElement);

        const pdfContent = printableElement.querySelector("#tradePdfContent");

        if (typeof html2pdf === "function") {
            const options = {
                margin: 0,
                filename: fileName,
                image: {
                    type: "jpeg",
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff"
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },
                pagebreak: {
                    mode: ["avoid-all", "css", "legacy"]
                }
            };

            await html2pdf()
                .set(options)
                .from(pdfContent)
                .save();

            document.body.removeChild(printableElement);
        } else {
            document.body.removeChild(printableElement);

            alert("کتابخانه html2pdf بارگذاری نشده است. لطفاً CDN مربوط به html2pdf را در index.html اضافه کنید.");
        }

    } catch (error) {
        console.error("PDF Error:", error);
        alert("خطا در ساخت PDF معامله");
    }
}

window.openPdfTrade = openPdfTrade;

/* =====================================================
   پایان بخش PDF معامله
===================================================== */

window.addEventListener("load", async () => {
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(granted => {
            if (granted) {
                console.log("Persistent storage فعال شد");
            }
        });
    }

    let shouldRestore = true;

    if (typeof getAllCustomers === "function") {
        const customers = await getAllCustomers();
        if (customers.length > 0) {
            shouldRestore = false;
        }
    }

    if (shouldRestore && typeof checkAutoRestore === "function") {
        await checkAutoRestore();
    }

    await loadCustomerDropdown();
    await loadTransactions();

    updatePaidLabel();

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js");
    }
});

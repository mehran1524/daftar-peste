// دریافت id مشتری از آدرس صفحه
const urlParams = new URLSearchParams(window.location.search);
const customerId = Number(urlParams.get("id"));

const ledgerList = document.getElementById("ledgerList");
const customerNameDisplay = document.getElementById("customerNameDisplay");
const customerPhoneDisplay = document.getElementById("customerPhoneDisplay");
const callBtn = document.getElementById("callBtn");

// اختلاف زمانی برای گروه‌بندی (۲ دقیقه)
const GROUP_TIME_DIFF = 120000;

function formatNumber(num) {
    return Math.abs(num).toLocaleString("fa-IR");
}

async function initLedger() {

    if (!customerId) {
        alert("مشتری انتخاب نشده است");
        window.location.href = "customers.html";
        return;
    }

    const customers = await getAllCustomers();
    const transactions = await getAllTransactions();

    const customer = customers.find(c => c.id === customerId);

    if (!customer) {
        alert("مشتری پیدا نشد");
        return;
    }

    // نمایش اطلاعات هدر
    customerNameDisplay.textContent = customer.name;
    customerPhoneDisplay.textContent = customer.phone || "بدون شماره تماس";

    if (customer.phone && customer.phone.trim() !== "") {
        callBtn.style.display = "flex";
        callBtn.onclick = () => { window.location.href = `tel:${customer.phone}`; };
    } else {
        callBtn.style.display = "none";
    }

    // مرتب سازی تراکنش‌ها (قدیم → جدید)
    let customerTransactions = transactions
        .filter(t => t.customerId === customerId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // گروه بندی معامله + پرداخت نزدیک
    let grouped = [];

    for (let i = 0; i < customerTransactions.length; i++) {

        let current = customerTransactions[i];
        let next = customerTransactions[i + 1];

        let groupItem = {
            date: current.createdAt,
            type: current.type,
            total: 0,
            paid: 0,
            rowBalance: 0
        };

        if (current.type === "buy" || current.type === "sell") {

            groupItem.total = Number(current.amount);

            if (next && (next.type === "debt" || next.type === "credit")) {

                const timeDiff = Math.abs(
                    new Date(next.createdAt) - new Date(current.createdAt)
                );

                if (timeDiff <= GROUP_TIME_DIFF) {

                    groupItem.paid = Number(next.amount);
                    i++;
                }
            }

        } else {
            groupItem.paid = Number(current.amount);
        }

        // مانده همان ردیف معامله
        groupItem.rowBalance =
            (groupItem.total || 0) + (groupItem.paid || 0);

        grouped.push(groupItem);
    }

    // نمایش جدید → قدیم
    grouped.reverse();

    ledgerList.innerHTML = "";

    grouped.forEach(item => {

        const dateStr = new Date(item.date)
            .toLocaleDateString("fa-IR");

        let typeLabel = "";
        let totalAmount = "";
        let paidAmount = "";

        if (item.type === "buy") typeLabel = "خرید";
        if (item.type === "sell") typeLabel = "فروش";
        if (item.type === "debt") typeLabel = "پرداخت";
        if (item.type === "credit") typeLabel = "دریافت";

        if (item.total !== 0) {
            totalAmount =
                (item.total >= 0 ? "+" : "-") +
                formatNumber(item.total);
        }

        if (item.paid !== 0) {
            paidAmount =
                (item.paid >= 0 ? "+" : "-") +
                formatNumber(item.paid);
        }

        const balanceClass =
            item.rowBalance >= 0
                ? "balance-positive"
                : "balance-negative";

        const balanceDisplay =
            (item.rowBalance >= 0 ? "+" : "-") +
            formatNumber(item.rowBalance);

        const row = document.createElement("div");
        row.className = "ledger-row";

        row.innerHTML = `
            <span class="ledger-date">${dateStr}</span>
            <span class="ledger-type">${typeLabel}</span>
            <span class="ledger-total">${totalAmount}</span>
            <span class="ledger-paid">${paidAmount}</span>
            <span class="ledger-row-balance ${balanceClass}">
                ${balanceDisplay}
            </span>
        `;

        ledgerList.appendChild(row);
    });
}

initLedger();

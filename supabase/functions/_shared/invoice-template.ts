interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  date: string;
  time: string;
  transactionId: string;
  paymentMethod: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  isFree: boolean;
  razorpayDetails?: {
    orderId: string;
    paymentId: string;
  };
  wordDetails?: {
    words: number;
    plan: string;
    pricePerThousand: number;
  } | null;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${data.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .invoice-header {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .company-name {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .company-website {
      font-size: 14px;
      opacity: 0.9;
    }

    .invoice-body {
      padding: 40px;
    }

    .invoice-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 30px;
      color: #f97316;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    ${data.isFree ? `
    .free-badge {
      background: #10b981;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    ` : ''}

    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }

    .detail-section h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .detail-item {
      margin-bottom: 8px;
      font-size: 14px;
    }

    .detail-label {
      color: #6b7280;
      display: inline-block;
      width: 120px;
    }

    .detail-value {
      color: #111827;
      font-weight: 500;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .items-table thead {
      background: #f9fafb;
    }

    .items-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .items-table td {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
    }

    .items-table td:last-child,
    .items-table th:last-child {
      text-align: right;
    }

    ${data.isFree ? `
    .free-amount {
      color: #10b981;
      font-weight: 600;
    }
    ` : ''}

    .totals-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 15px;
    }

    .total-row.grand-total {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      margin-top: 10px;
    }

    ${data.isFree ? `
    .total-row.grand-total .amount {
      color: #10b981;
    }
    ` : ''}

    ${data.wordDetails ? `
    .word-details-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .word-details-box h4 {
      color: #92400e;
      font-size: 14px;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .word-details-box p {
      color: #78350f;
      font-size: 13px;
      margin: 4px 0;
    }
    ` : ''}

    .invoice-footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .footer-text {
      font-size: 13px;
      color: #6b7280;
      margin: 8px 0;
    }

    .footer-text.support {
      color: #f97316;
      font-weight: 600;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .invoice-container {
        box-shadow: none;
        border-radius: 0;
      }
    }

    @media (max-width: 600px) {
      .invoice-body {
        padding: 20px;
      }

      .invoice-details {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .invoice-title {
        font-size: 22px;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .items-table {
        font-size: 12px;
      }

      .items-table th,
      .items-table td {
        padding: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="invoice-header">
      <div class="company-name">Tone2Vibe</div>
      <div class="company-website">https://tone2vibe.in</div>
    </div>

    <!-- Body -->
    <div class="invoice-body">
      <div class="invoice-title">
        <span>INVOICE</span>
        ${data.isFree ? '<span class="free-badge">Free Activation</span>' : ''}
      </div>

      <!-- Invoice Details -->
      <div class="invoice-details">
        <div class="detail-section">
          <h3>Invoice Information</h3>
          <div class="detail-item">
            <span class="detail-label">Invoice No:</span>
            <span class="detail-value">${data.invoiceNumber}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${data.date}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${data.time}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Customer Details</h3>
          <div class="detail-item">
            <span class="detail-label">Name:</span>
            <span class="detail-value">${data.customerName}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${data.customerEmail}</span>
          </div>
        </div>
      </div>

      <div class="detail-section" style="margin-bottom: 20px;">
        <h3>Payment Details</h3>
        <div class="detail-item">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">${data.transactionId}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${data.paymentMethod}</span>
        </div>
        ${data.razorpayDetails ? `
        <div class="detail-item">
          <span class="detail-label">Order ID:</span>
          <span class="detail-value">${data.razorpayDetails.orderId}</span>
        </div>
        ` : ''}
      </div>

      ${data.wordDetails ? `
      <div class="word-details-box">
        <h4>📦 Word Purchase Details</h4>
        <p><strong>Words Purchased:</strong> ${data.wordDetails.words.toLocaleString()} words</p>
        <p><strong>Your Plan:</strong> ${data.wordDetails.plan.toUpperCase()}</p>
        <p><strong>Rate:</strong> ₹${data.wordDetails.pricePerThousand} per 1,000 words</p>
      </div>
      ` : ''}

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;" class="${data.isFree ? 'free-amount' : ''}">
              ${data.isFree ? 'FREE' : formatCurrency(item.rate)}
            </td>
            <td style="text-align: right;" class="${data.isFree ? 'free-amount' : ''}">
              ${data.isFree ? 'FREE' : formatCurrency(item.amount)}
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span class="${data.isFree ? 'free-amount' : ''}">
            ${data.isFree ? 'FREE' : formatCurrency(data.subtotal)}
          </span>
        </div>
        ${data.discount > 0 ? `
        <div class="total-row">
          <span>Discount:</span>
          <span style="color: #10b981;">-${formatCurrency(data.discount)}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
          <span>Total Amount:</span>
          <span class="amount">
            ${data.isFree ? 'FREE (₹0.00)' : formatCurrency(data.total)}
          </span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="invoice-footer">
      <p class="footer-text">Thank you for choosing Tone2Vibe!</p>
      <p class="footer-text support">For support: support@tone2vibe.in</p>
      <p class="footer-text">This is a computer-generated invoice and does not require a signature.</p>
    </div>
  </div>
</body>
</html>`;
}
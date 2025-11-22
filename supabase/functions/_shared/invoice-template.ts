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

  const lineItemsHTML = data.items.map(item => `
    <tr>
      <td class="item-description">${item.description}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${data.isFree ? '<span class="free-badge">FREE</span>' : formatCurrency(item.rate)}</td>
      <td style="text-align: right;">${data.isFree ? '<span class="free-badge">FREE</span>' : formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice - ${data.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #f5f5f5;
      padding: 40px 20px;
      color: #000;
      line-height: 1.6;
    }

    .invoice-wrapper {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      padding: 60px;
      box-shadow: 0 0 40px rgba(0,0,0,0.1);
    }
    
    .invoice-header {
      border-bottom: 2px solid #000;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .logo-section img {
      height: 50px;
      width: 50px;
    }
    
    .company-name {
      font-size: 32px;
      font-weight: 400;
      letter-spacing: 2px;
    }
    
    .invoice-title {
      text-align: right;
    }
    
    .invoice-title h1 {
      font-size: 48px;
      font-weight: 300;
      letter-spacing: 3px;
      margin-bottom: 5px;
    }
    
    .invoice-number {
      font-size: 14px;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
    }

    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 50px;
    }
    
    .info-block h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      font-weight: 600;
      color: #666;
    }
    
    .info-content {
      font-size: 15px;
      line-height: 1.8;
    }
    
    .info-content strong {
      font-weight: 600;
    }

    .items-table {
      width: 100%;
      margin: 50px 0;
      border-collapse: collapse;
    }
    
    .items-table thead th {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 15px 0;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }
    
    .items-table thead th:last-child {
      text-align: right;
    }
    
    .items-table tbody td {
      padding: 20px 0;
      border-bottom: 1px solid #e0e0e0;
      font-size: 15px;
    }
    
    .items-table tbody td:last-child {
      text-align: right;
    }
    
    .items-table tbody tr:last-child td {
      border-bottom: 1px solid #000;
    }
    
    .item-description {
      font-weight: 400;
    }
    
    .free-badge {
      background: #000;
      color: white;
      padding: 3px 10px;
      font-size: 11px;
      letter-spacing: 1px;
      font-weight: 600;
      font-family: 'Arial', sans-serif;
    }

    .summary-section {
      margin: 50px 0;
      padding: 30px 0;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      font-size: 15px;
    }
    
    .summary-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
      color: #666;
    }
    
    .summary-value {
      font-weight: 400;
      font-family: 'Courier New', monospace;
    }
    
    .total-row {
      border-top: 1px solid #000;
      margin-top: 15px;
      padding-top: 25px;
    }
    
    .total-row .summary-label {
      font-size: 13px;
      color: #000;
    }
    
    .total-row .summary-value {
      font-size: 28px;
      font-weight: 600;
    }

    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .thank-you {
      font-size: 18px;
      font-style: italic;
      font-weight: 300;
      letter-spacing: 1px;
    }
    
    .contact-info {
      text-align: right;
      font-size: 13px;
      line-height: 1.8;
      font-family: 'Courier New', monospace;
    }
    
    .contact-info a {
      color: #000;
      text-decoration: none;
      border-bottom: 1px solid #000;
      transition: opacity 0.2s;
    }
    
    .contact-info a:hover {
      opacity: 0.6;
    }

    @media (max-width: 768px) {
      body {
        padding: 20px 10px;
      }
      
      .invoice-wrapper {
        padding: 40px 30px;
      }
      
      .header-top {
        flex-direction: column;
        gap: 30px;
      }
      
      .invoice-title {
        text-align: left;
      }
      
      .invoice-title h1 {
        font-size: 36px;
      }
      
      .company-name {
        font-size: 24px;
      }
      
      .info-section {
        grid-template-columns: 1fr;
        gap: 30px;
      }
      
      .items-table {
        font-size: 13px;
      }
      
      .items-table thead th,
      .items-table tbody td {
        padding: 12px 5px;
      }
      
      .footer {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }
      
      .contact-info {
        text-align: center;
      }
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .invoice-wrapper {
        box-shadow: none;
        padding: 40px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Header -->
    <div class="invoice-header">
      <div class="header-top">
        <div class="logo-section">
          <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png" alt="Tone2Vibe Logo">
          <div class="company-name">Tone2Vibe</div>
        </div>
        <div class="invoice-title">
          <h1>INVOICE</h1>
          <div class="invoice-number">#${data.invoiceNumber}</div>
        </div>
      </div>
    </div>
    
    <!-- Info Section -->
    <div class="info-section">
      <div class="info-block">
        <h3>Bill To</h3>
        <div class="info-content">
          <strong>${data.customerName}</strong><br>
          ${data.customerEmail}
        </div>
      </div>
      <div class="info-block">
        <h3>Invoice Details</h3>
        <div class="info-content">
          <strong>Date:</strong> ${data.date}<br>
          <strong>From:</strong> Tone2Vibe, India
        </div>
      </div>
    </div>
    
    <!-- Line Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%">Description</th>
          <th style="width: 15%">Quantity</th>
          <th style="width: 17.5%">Price</th>
          <th style="width: 17.5%">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHTML}
      </tbody>
    </table>
    
    <!-- Summary -->
    <div class="summary-section">
      <div class="summary-row">
        <div class="summary-label">Transaction ID</div>
        <div class="summary-value">${data.transactionId}</div>
      </div>
      ${data.razorpayDetails ? `
      <div class="summary-row">
        <div class="summary-label">Order ID</div>
        <div class="summary-value">${data.razorpayDetails.orderId}</div>
      </div>
      ` : ''}
      <div class="summary-row">
        <div class="summary-label">Payment Method</div>
        <div class="summary-value">${data.paymentMethod}</div>
      </div>
      <div class="summary-row total-row">
        <div class="summary-label">Total Amount Due</div>
        <div class="summary-value">
          ${data.isFree ? '<span class="free-badge">FREE</span>' : formatCurrency(data.total)}
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">Thank you for your business</div>
      <div class="contact-info">
        <a href="mailto:support@tone2vibe.in">support@tone2vibe.in</a><br>
        <a href="https://tone2vibe.in" target="_blank">tone2vibe.in</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
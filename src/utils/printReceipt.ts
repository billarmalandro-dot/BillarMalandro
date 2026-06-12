export interface ReceiptData {
  tipo: "mesa" | "directa";
  mesaNumero?: number;
  cajero: string;
  cliente?: string;
  tiempo?: {
    horas: string;
    costo: number;
    tarifaNombre?: string;
    horaInicio?: string;
    precioPorHora?: number;
    horasRegaloPromo?: number;
  };
  productos: {
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
  totalGeneral: number;
  metodoPago: string;
}

export function printReceipt(data: ReceiptData) {
  const dateStr = new Date().toLocaleString("es-BO");
  const logoUrl = "/logo_transparente.png"; // Se asume que el logo est en public/logo_transparente.png

  let timeSection = "";
  if (data.tipo === "mesa" && data.tiempo) {
    timeSection = `
      <div class="divider"></div>
      <div style="text-align:center; font-weight:bold; margin: 10px 0 5px 0;">
        DETALLE DE CONSUMO
      </div>
      ${data.tiempo.horaInicio ? `
      <div class="row text-sm">
        <span>Hora inicio juego</span>
        <span>${data.tiempo.horaInicio}</span>
      </div>
      ` : ''}
      ${data.tiempo.precioPorHora ? `
      <div class="row text-sm">
        <span>Precio por hora</span>
        <span>${data.tiempo.precioPorHora.toFixed(2)} Bs.</span>
      </div>
      ` : ''}
      <div class="row text-sm">
        <span>Tiempo total jugado</span>
        <span>${data.tiempo.horas} hrs</span>
      </div>
      ${(data.tiempo.horasRegaloPromo && data.tiempo.horasRegaloPromo > 0) ? `
      <div class="row text-sm">
        <span>Horas Regalo (Promo)</span>
        <span>- ${data.tiempo.horasRegaloPromo} hrs</span>
      </div>
      ` : ''}
      <div class="row text-sm" style="margin-bottom: 5px;">
        <span>Costo del tiempo</span>
        <span>${data.tiempo.costo.toFixed(2)} Bs.</span>
      </div>
    `;
  } else if (data.productos.length > 0) {
    timeSection = `
      <div class="divider"></div>
      <div style="text-align:center; font-weight:bold; margin: 10px 0 5px 0;">
        DETALLE DE CONSUMO
      </div>
    `;
  }

  let productsSection = "";
  if (data.productos.length > 0) {
    productsSection = `
      ${data.productos.map(p => `
        <div class="row text-sm">
          <span>${p.cantidad}x ${p.nombre}</span>
          <span>Bs. ${p.subtotal.toFixed(2)}</span>
        </div>
      `).join('')}
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Ticket de Venta</title>
      <style>
        @page { margin: 0; size: auto; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          margin: 0; 
          padding: 2px; 
          width: 58mm; /* Ancho estándar de ticketera pequeña */
          color: #000;
        }
        .ticket { width: 100%; max-width: 58mm; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 5px; }
        .header img { max-width: 60px; margin-bottom: 5px; }
        .header h1 { font-size: 14px; margin: 0; padding: 0; font-weight: bold; text-transform: uppercase; }
        .header p { font-size: 10px; margin: 2px 0; }
        .divider { border-top: 1px dashed #000; margin: 3px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
        .text-sm { font-size: 10px; }
        .total-row { font-size: 13px; font-weight: bold; margin-top: 5px; }
        .footer { text-align: center; font-size: 9px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">
          <!-- <img src="${logoUrl}" alt="Logo" /> -->
          <h1>EL MALANDRO</h1>
          <p>Ticket de Consumo</p>
          <p>${dateStr}</p>
        </div>
        
        <div class="divider"></div>
        <div class="row text-sm">
          <span>Tipo:</span>
          <span>${data.tipo === "mesa" ? "Uso de Mesa" : "Venta Directa"}</span>
        </div>
        ${data.tipo === "mesa" ? `
        <div class="row text-sm">
          <span>Mesa:</span>
          <span>#${data.mesaNumero}</span>
        </div>
        ` : ''}
        ${data.cliente ? `
        <div class="row text-sm">
          <span>Cliente:</span>
          <span>${data.cliente}</span>
        </div>
        ` : ''}
        <div class="row text-sm">
          <span>Atendido por:</span>
          <span>${data.cajero}</span>
        </div>

        ${timeSection}
        ${productsSection}

        <div class="divider"></div>
        <div class="row total-row">
          <span>TOTAL A PAGAR</span>
          <span>Bs. ${data.totalGeneral.toFixed(2)}</span>
        </div>
        <div class="row text-sm">
          <span>Método de Pago:</span>
          <span style="text-transform: capitalize;">${data.metodoPago}</span>
        </div>

        <div class="divider"></div>
        <div class="footer">
          <p>¡Gracias por tu preferencia!</p>
          <p>¡Te esperamos pronto!</p>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        }
      </script>
    </body>
    </html>
  `;

  // Abrir ventana oculta para imprimir
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

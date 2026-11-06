export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return response.status(500).json({ error: 'Telegram belum dikonfigurasi' })
  }

  const { order, referenceCode, paymentMethod, phoneConfirmation } = request.body || {}
  if (phoneConfirmation) {
    const phone = String(phoneConfirmation).trim()
    if (!/^[0-9+() -]{8,16}$/.test(phone)) {
      return response.status(400).json({ error: 'Nomor HP tidak valid' })
    }

    return sendTelegram(response, [
      '<b>Konfirmasi nomor HP baru</b>',
      '',
      `<b>No. HP:</b> ${escapeHtml(phone)}`,
      '<i>Pengguna menekan tombol Konfirmasi nomor HP.</i>',
    ].join('\\n'), token, chatId)
  }

  if (!order || !order.recipient || !order.product || !referenceCode || !paymentMethod) {
    return response.status(400).json({ error: 'Data formulir tidak lengkap' })
  }

  const message = [
    '<b>Laporan pengisian formulir baru</b>',
    '',
    `<b>Penerima:</b> ${escapeHtml(order.recipient)}`,
    `<b>No. HP:</b> ${escapeHtml(order.phone)}`,
    `<b>Produk:</b> ${escapeHtml(order.product)}`,
    `<b>Jumlah:</b> ${Number(order.quantity)}`,
    `<b>Total:</b> Rp${Number(order.total).toLocaleString('id-ID')}`,
    `<b>Metode pembayaran:</b> ${escapeHtml(paymentMethod)}`,
    `<b>Kode referensi:</b> GRV - ${escapeHtml(referenceCode)}`,
    order.note ? `<b>Catatan:</b> ${escapeHtml(order.note)}` : '',
  ].filter(Boolean).join('\\n')

  return sendTelegram(response, message, token, chatId)
}

async function sendTelegram(response, message, token, chatId) {
  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })

    if (!telegramResponse.ok) {
      return response.status(502).json({ error: 'Telegram gagal menerima laporan' })
    }

    return response.status(200).json({ ok: true })
  } catch {
    return response.status(502).json({ error: 'Tidak dapat menghubungi Telegram' })
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

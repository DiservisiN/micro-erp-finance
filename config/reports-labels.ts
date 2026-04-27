export const reportsLabels = {
  filters: {
    all: 'Semua',
    income: 'Pemasukan',
    operatingExpenses: 'Biaya Operasional',
    assetsTransfers: 'Aset & Transfer',
  },
  tableHeaders: {
    date: 'Tanggal',
    type: 'Tipe',
    amount: 'Jumlah',
    adminFee: 'Biaya Admin',
    notes: 'Catatan',
    actions: 'Aksi',
  },
  buttons: {
    exportToCSV: 'Export to CSV',
    cancel: 'Batal',
    delete: 'Hapus',
    saveChanges: 'Simpan Perubahan',
    printReceipt: 'Cetak Resi',
  },
  titles: {
    financialReports: 'Laporan Keuangan',
    description: 'Analisis keuangan tingkat tinggi dan riwayat transaksi.',
    allTransactions: 'Semua Transaksi',
    allTransactionsDesc: 'Log lengkap semua aktivitas modul',
    incomeTransactions: 'Transaksi Pemasukan',
    incomeTransactionsDesc: 'Pendapatan dari penjualan, layanan, komisi, dan sumber pendapatan lainnya',
    operatingExpenses: 'Biaya Operasional',
    operatingExpensesDesc: 'Biaya operasional (sewa, utilitas, perlengkapan, dll)',
    assetsTransfers: 'Aset & Transfer',
    assetsTransfersDesc: 'Pertukaran aset dan pergerakan dompet',
    receiptPreview: 'Pratinjau Resi',
    deleteTransaction: 'Hapus Transaksi',
    editTransaction: 'Edit Transaksi',
  },
  summaryCards: {
    totalRevenue: 'Total Pendapatan',
    totalExpenses: 'Total Pengeluaran',
    netProfit: 'Laba Bersih',
    profitMargin: 'Margin Laba',
  },
  messages: {
    loading: 'Memuat transaksi...',
    noTransactions: 'Tidak ada transaksi ditemukan.',
    deleteConfirm: 'Apakah Anda yakin? Ini akan <span class="font-semibold text-red-400">menghapus permanen</span> catatan transaksi ini.',
    deleteSuccess: 'Transaksi dihapus dan saldo dikembalikan dengan sukses',
    updateSuccess: 'Transaksi diperbarui dengan sukses',
    exportSuccess: 'Data berhasil diekspor',
  },
};

export type ReportsLabels = typeof reportsLabels;

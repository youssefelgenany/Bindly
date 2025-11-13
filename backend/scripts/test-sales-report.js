const salesReport = [
  {
    id: 'startup-summit',
    eventName: 'Startup Summit',
    totalRevenue: 32000,
    ticketsSold: 130,
    ticketPrice: 250,
    category: 'conference',
    location: 'GUC Cairo - Main Auditorium',
    startDate: '2025-03-10T09:00:00Z',
    endDate: '2025-03-10T19:00:00Z',
    notes: 'High turnout from alumni and industry partners.'
  },
  {
    id: 'innovation-bazaar',
    eventName: 'Innovation Bazaar',
    totalRevenue: 18450,
    ticketsSold: 410,
    ticketPrice: 0,
    category: 'bazaar',
    location: 'GUC Cairo - Central Plaza',
    startDate: '2025-02-05T08:00:00Z',
    endDate: '2025-02-07T21:00:00Z',
    notes: 'Vendor booth fees accounted for 60% of revenue.'
  },
  {
    id: 'tech-workshop-series',
    eventName: 'Tech Workshop Series',
    totalRevenue: 12900,
    ticketsSold: 86,
    ticketPrice: 200,
    category: 'workshop',
    location: 'GUC Cairo - Building C Labs',
    startDate: '2025-01-20T10:00:00Z',
    endDate: '2025-01-22T16:00:00Z',
    notes: 'Bundle passes resulted in 20% higher revenue than expected.'
  },
  {
    id: 'career-fair',
    eventName: 'Spring Career Fair',
    totalRevenue: 45000,
    ticketsSold: 600,
    ticketPrice: 0,
    category: 'booth',
    location: 'GUC Cairo - Sports Complex',
    startDate: '2025-04-15T09:00:00Z',
    endDate: '2025-04-15T18:00:00Z',
    notes: 'Corporate sponsorships accounted for 75% of revenue.'
  },
  {
    id: 'cultural-night',
    eventName: 'Cultural Night Gala',
    totalRevenue: 21250,
    ticketsSold: 170,
    ticketPrice: 150,
    category: 'conference',
    location: 'GUC Cairo - Event Hall',
    startDate: '2025-05-05T18:00:00Z',
    endDate: '2025-05-05T23:00:00Z',
    notes: 'Merchandise sales exceeded target by 30%.'
  }
];

function printSalesReport() {
  console.log('📊 GUC Events Sales Report (Test Data)\n');
  salesReport.forEach((entry, index) => {
    console.log(
      `${index + 1}. ${entry.eventName} — Revenue: EGP ${entry.totalRevenue.toLocaleString()} | Tickets Sold: ${entry.ticketsSold}`
    );
  });

  const totalRevenue = salesReport.reduce(
    (sum, entry) => sum + (entry.totalRevenue || 0),
    0
  );

  console.log('\n───────────────');
  console.log(`Total Revenue: EGP ${totalRevenue.toLocaleString()}`);
  console.log(`Events Count: ${salesReport.length}`);
}

module.exports = {
  salesReport,
  printSalesReport
};

if (require.main === module) {
  printSalesReport();
}


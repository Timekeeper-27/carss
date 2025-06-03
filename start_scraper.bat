<script>
async function startScraping() {
  const url = document.getElementById('search').value;
  if (!url) {
    alert('Please paste a URL!');
    return;
  }
  try {
    const res = await fetch(`/scrape?url=${encodeURIComponent(url)}`);
    let data;
    try {
      data = await res.json(); // Try parsing JSON
    } catch (err) {
      throw new Error("Server returned non-JSON response. Website might be blocking scraping.");
    }
    
    if (data.listings.length === 0) {
      document.getElementById('listings').innerHTML = '<p class="text-danger">No listings found. Try another site.</p>';
      return;
    }
    
    let table = '<table class="table table-striped"><thead><tr><th>Title</th><th>Price</th><th>Link</th></tr></thead><tbody>';
    data.listings.forEach(car => {
      table += `<tr><td>${car.title}</td><td>$${car.price}</td><td><a href="${car.link}" target="_blank">View</a></td></tr>`;
    });
    table += '</tbody></table>';
    document.getElementById('listings').innerHTML = table;
    
  } catch (error) {
    document.getElementById('listings').innerHTML = `<p class="text-danger">Error fetching listings: ${error.message}</p>`;
  }
}
</script>

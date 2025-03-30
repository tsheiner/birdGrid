/**
 * BIRDS OF COSTA RICA GALLERY
 * 
 * This script loads bird data from a JSON file and creates a visual gallery.
 * It uses Wikimedia Commons API to fetch bird images, prioritizing scientific names
 * which typically have more standardized and higher quality images.
 */

/**
 * Fetches a bird image from Wikimedia Commons using scientific name
 * 
 * @param {string} scientificName - Scientific name of the bird
 * @returns {Object|null} - Image information or null if not found
 */
async function fetchBirdImageFromCommons(scientificName) {
    try {
        console.log(`Searching Commons for ${scientificName}`);
        
        // First approach: Try to find images directly in the category for this species
        // Categories in Commons are organized taxonomically by scientific name
        const categoryUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(scientificName)}&cmtype=file&prop=imageinfo&iiprop=url&format=json&origin=*`;
        
        const categoryResponse = await fetch(categoryUrl);
        
        if (categoryResponse.ok) {
            const data = await categoryResponse.json();
            
            // Check if we found any images in this category
            if (data.query && data.query.categorymembers && data.query.categorymembers.length > 0) {
                // Filter for appropriate images (jpg/png and exclude maps/diagrams)
                const filteredImages = data.query.categorymembers.filter(item => {
                    const title = item.title.toLowerCase();
                    return (title.endsWith('.jpg') || 
                            title.endsWith('.jpeg') || 
                            title.endsWith('.png')) &&
                            !title.includes('map') &&
                            !title.includes('distribution') &&
                            !title.includes('range') &&
                            !title.includes('diagram');
                });
                
                if (filteredImages.length > 0) {
                    // Get image info for the first matching image
                    const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(filteredImages[0].title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
                    
                    const imageInfoResponse = await fetch(imageInfoUrl);
                    
                    if (imageInfoResponse.ok) {
                        const imageData = await imageInfoResponse.json();
                        
                        if (imageData.query && imageData.query.pages) {
                            const pageId = Object.keys(imageData.query.pages)[0];
                            const page = imageData.query.pages[pageId];
                            
                            if (page.imageinfo && page.imageinfo.length > 0) {
                                console.log(`Found image for ${scientificName} in Commons category`);
                                return {
                                    url: page.imageinfo[0].url,
                                    link: `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(scientificName)}`
                                };
                            }
                        }
                    }
                }
            }
            
            // Second approach: Try a direct search in Commons
            // This is useful when the category doesn't exist but images might be
            // available under different categorization
            const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(scientificName)}+incategory:Birds&srnamespace=6&format=json&origin=*`;
            
            const searchResponse = await fetch(searchUrl);
            
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                
                if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
                    // Filter out non-image results and maps/diagrams
                    const filteredResults = searchData.query.search.filter(item => {
                        const title = item.title.toLowerCase();
                        return (title.endsWith('.jpg') || 
                                title.endsWith('.jpeg') || 
                                title.endsWith('.png')) &&
                                !title.includes('map') &&
                                !title.includes('distribution') &&
                                !title.includes('range') &&
                                !title.includes('diagram');
                    });
                    
                    if (filteredResults.length > 0) {
                        // Get image info for the best search result
                        const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(filteredResults[0].title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
                        
                        const imageInfoResponse = await fetch(imageInfoUrl);
                        
                        if (imageInfoResponse.ok) {
                            const imageData = await imageInfoResponse.json();
                            
                            if (imageData.query && imageData.query.pages) {
                                const pageId = Object.keys(imageData.query.pages)[0];
                                const page = imageData.query.pages[pageId];
                                
                                if (page.imageinfo && page.imageinfo.length > 0) {
                                    console.log(`Found image for ${scientificName} via direct search`);
                                    return {
                                        url: page.imageinfo[0].url,
                                        link: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filteredResults[0].title.replace('File:', ''))}`
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`No suitable image found for ${scientificName} in Commons`);
        return null;
    } catch (error) {
        console.error(`Error searching Commons for ${scientificName}:`, error);
        return null;
    }
}

/**
 * Fallback to search Wikipedia API for an image using common name
 * Only used if Commons search fails
 * 
 * @param {string} commonName - Common name of the bird
 * @returns {Object|null} - Image information or null if not found
 */
async function fetchBirdImageFromWikipedia(commonName) {
    try {
        console.log(`Falling back to Wikipedia search for ${commonName}`);
        
        // Try the Wikipedia REST API first - simpler and more reliable
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonName.replace(/ /g, "_"))}`;
        
        const summaryResponse = await fetch(summaryUrl);
        
        if (summaryResponse.ok) {
            const data = await summaryResponse.json();
            
            if (data.thumbnail && data.thumbnail.source) {
                console.log(`Found image for ${commonName} using Wikipedia summary API`);
                return {
                    url: data.thumbnail.source,
                    link: data.content_urls.desktop.page
                };
            }
        }
        
        // If that fails, try searching Wikipedia first
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(commonName + " bird")}&format=json&origin=*`;
        
        const searchResponse = await fetch(searchUrl);
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            
            if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
                const pageTitle = searchData.query.search[0].title;
                console.log(`Found Wikipedia article: ${pageTitle} for ${commonName}`);
                
                // Now get the summary for this page which includes thumbnail
                const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`;
                
                const pageResponse = await fetch(pageUrl);
                
                if (pageResponse.ok) {
                    const pageData = await pageResponse.json();
                    
                    if (pageData.thumbnail && pageData.thumbnail.source) {
                        console.log(`Found image for ${commonName} via Wikipedia search`);
                        return {
                            url: pageData.thumbnail.source,
                            link: pageData.content_urls.desktop.page
                        };
                    }
                }
            }
        }
        
        console.log(`No Wikipedia image found for ${commonName}`);
        return null;
    } catch (error) {
        console.error(`Error fetching Wikipedia image for ${commonName}:`, error);
        return null;
    }
}

/**
 * Try to fetch an image using scientific name first, then common name as fallback
 * 
 * @param {string} commonName - Common name of the bird
 * @param {string} scientificName - Scientific name of the bird
 * @returns {Object|null} - Image information or null if not found
 */
async function fetchBirdImageWithFallback(commonName, scientificName) {
    // First try using scientific name with Commons API (most reliable)
    let imageInfo = null;
    
    if (scientificName) {
        imageInfo = await fetchBirdImageFromCommons(scientificName);
    }
    
    // If that doesn't work, try the common name with Wikipedia
    if (!imageInfo) {
        console.log(`No Commons image found for ${scientificName}, trying Wikipedia with common name: ${commonName}`);
        imageInfo = await fetchBirdImageFromWikipedia(commonName);
    }
    
    return imageInfo;
}

/**
 * Creates a card element for a bird
 * 
 * @param {string} commonName - Common name of the bird
 * @param {Object|null} imageInfo - Information about the bird's image
 * @returns {HTMLElement} - The card element
 */
function createBirdCard(commonName, imageInfo) {
    const birdCard = document.createElement("div");
    birdCard.className = "bird-card";
    
    // Create image element
    const img = document.createElement("img");
    img.alt = commonName;
    
    // Use the image URL or a placeholder
    img.src = imageInfo ? imageInfo.url : `https://placehold.co/300x200?text=${encodeURIComponent(commonName)}`;
    
    // Add error handling for image loading failures
    img.onerror = function() {
        console.log(`Failed to load image for ${commonName}, using placeholder`);
        this.src = `https://placehold.co/300x200?text=${encodeURIComponent(commonName)}`;
    };
    
    // Create link element
    const link = document.createElement("a");
    link.href = imageInfo ? imageInfo.link : `https://en.wikipedia.org/wiki/${commonName.replace(/ /g, "_")}`;
    link.target = "_blank"; // Open in new tab
    link.textContent = commonName;
    
    // Assemble the card
    birdCard.appendChild(img);
    birdCard.appendChild(link);
    
    return birdCard;
}

/**
 * Loads bird data from JSON and creates the gallery
 */
async function loadBirds() {
    const container = document.getElementById("birds-container");
    container.innerHTML = '<div class="loading">Loading bird data...</div>';

    try {
        // Fetch and parse the bird data
        const response = await fetch("birds_of_costa_rica.json");
        if (!response.ok) {
            throw new Error(`Failed to fetch bird data: ${response.status}`);
        }
        
        const birdsByCategory = await response.json();
        container.innerHTML = ''; // Clear loading message

        // Process each category of birds
        for (const [category, birds] of Object.entries(birdsByCategory)) {
            // Create category header
            const categoryTitle = document.createElement("div");
            categoryTitle.className = "category";
            categoryTitle.innerText = category;
            container.appendChild(categoryTitle);
            
            // Process birds in this category
            for (let i = 0; i < birds.length; i++) {
                try {
                    const bird = birds[i];
                    
                    // Fetch the image for this bird - try scientific name first
                    const imageInfo = await fetchBirdImageWithFallback(
                        bird.common_name, 
                        bird.scientific_name
                    );
                    
                    // Create a card for this bird
                    const card = createBirdCard(bird.common_name, imageInfo);
                    container.appendChild(card);
                    
                    // Add a small delay between requests to avoid overwhelming APIs
                    if (i < birds.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error(`Error creating card for ${birds[i].common_name}:`, error);
                    const card = createBirdCard(birds[i].common_name, null);
                    container.appendChild(card);
                }
            }
        }
    } catch (error) {
        console.error("Error loading birds:", error);
        container.innerHTML = `<p class="error">Failed to load bird data. Please try again later.</p>`;
    }
}

/**
 * Sets up search/filtering functionality
 */
function setupFiltering() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Filter birds...';
    searchInput.className = 'search-input';
    document.body.insertBefore(searchInput, document.getElementById('birds-container'));
    
    searchInput.addEventListener('input', function() {
        const filter = this.value.toLowerCase();
        const categories = document.querySelectorAll('.category');
        
        // Create a map to track which categories have visible birds
        const categoryVisibility = new Map();
        categories.forEach(cat => categoryVisibility.set(cat, false));
        
        // Track the current category
        let currentCategory = null;
        
        // Check each element in the birds container
        Array.from(document.getElementById('birds-container').children).forEach(element => {
            if (element.classList.contains('category')) {
                currentCategory = element;
                // Initially hide all categories
                element.style.display = 'none';
            } else if (element.classList.contains('bird-card')) {
                const birdName = element.querySelector('a').textContent.toLowerCase();
                
                // Show bird if name matches the filter
                const isVisible = birdName.includes(filter);
                element.style.display = isVisible ? '' : 'none';
                
                // If this bird is visible, its category should be visible too
                if (isVisible && currentCategory) {
                    categoryVisibility.set(currentCategory, true);
                }
            }
        });
        
        // Update category visibility
        categoryVisibility.forEach((isVisible, category) => {
            category.style.display = isVisible ? '' : 'none';
        });
    });
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadBirds(); // Load birds and create gallery
    setupFiltering(); // Setup search functionality
});
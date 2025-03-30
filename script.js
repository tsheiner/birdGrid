/**
 * BIRDS OF COSTA RICA GALLERY
 * 
 * This script loads bird data from a JSON file and creates a visual gallery.
 * It uses Wikimedia Commons API to fetch bird images, prioritizing scientific names
 * which typically have more standardized and higher quality images.
 * Clicking on an image loads alternative images for that bird if available.
 */

/**
 * Fetches bird images from Wikimedia Commons using scientific name
 * Returns multiple images when available
 * 
 * @param {string} scientificName - Scientific name of the bird
 * @returns {Array} - Array of image objects or empty array if none found
 */
async function fetchBirdImagesFromCommons(scientificName) {
    try {
        console.log(`Searching Commons for ${scientificName}`);
        const images = [];
        
        // First approach: Try to find images directly in the category for this species
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
                
                // Get image info for up to 5 matching images
                const maxImages = Math.min(filteredImages.length, 5);
                for (let i = 0; i < maxImages; i++) {
                    const imageTitle = filteredImages[i].title;
                    const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(imageTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
                    
                    const imageInfoResponse = await fetch(imageInfoUrl);
                    
                    if (imageInfoResponse.ok) {
                        const imageData = await imageInfoResponse.json();
                        
                        if (imageData.query && imageData.query.pages) {
                            const pageId = Object.keys(imageData.query.pages)[0];
                            const page = imageData.query.pages[pageId];
                            
                            if (page.imageinfo && page.imageinfo.length > 0) {
                                console.log(`Found image for ${scientificName} in Commons category: ${imageTitle}`);
                                images.push({
                                    url: page.imageinfo[0].url,
                                    link: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(imageTitle.replace('File:', ''))}`
                                });
                            }
                        }
                    }
                }
                
                if (images.length > 0) {
                    console.log(`Found ${images.length} images for ${scientificName} in Commons category`);
                    return images;
                }
            }
            
            // Second approach: Try a direct search in Commons
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
                    
                    // Get image info for up to 5 matching images
                    const maxResults = Math.min(filteredResults.length, 5);
                    for (let i = 0; i < maxResults; i++) {
                        const imageTitle = filteredResults[i].title;
                        const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(imageTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
                        
                        const imageInfoResponse = await fetch(imageInfoUrl);
                        
                        if (imageInfoResponse.ok) {
                            const imageData = await imageInfoResponse.json();
                            
                            if (imageData.query && imageData.query.pages) {
                                const pageId = Object.keys(imageData.query.pages)[0];
                                const page = imageData.query.pages[pageId];
                                
                                if (page.imageinfo && page.imageinfo.length > 0) {
                                    console.log(`Found image for ${scientificName} via direct search: ${imageTitle}`);
                                    images.push({
                                        url: page.imageinfo[0].url,
                                        link: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(imageTitle.replace('File:', ''))}`
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if (images.length === 0) {
            console.log(`No suitable images found for ${scientificName} in Commons`);
        } else {
            console.log(`Found ${images.length} total images for ${scientificName}`);
        }
        
        return images;
    } catch (error) {
        console.error(`Error searching Commons for ${scientificName}:`, error);
        return [];
    }
}

/**
 * Fallback to search Wikipedia API for images using common name
 * Only used if Commons search fails
 * 
 * @param {string} commonName - Common name of the bird
 * @returns {Array} - Array of image objects or empty array if none found
 */
async function fetchBirdImagesFromWikipedia(commonName) {
    try {
        console.log(`Falling back to Wikipedia search for ${commonName}`);
        const images = [];
        
        // Try the Wikipedia REST API first - simpler and more reliable
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonName.replace(/ /g, "_"))}`;
        
        const summaryResponse = await fetch(summaryUrl);
        
        if (summaryResponse.ok) {
            const data = await summaryResponse.json();
            
            if (data.thumbnail && data.thumbnail.source) {
                console.log(`Found image for ${commonName} using Wikipedia summary API`);
                images.push({
                    url: data.thumbnail.source,
                    link: data.content_urls.desktop.page
                });
                
                // Optionally try to get higher resolution version
                if (data.originalimage && data.originalimage.source) {
                    images.push({
                        url: data.originalimage.source,
                        link: data.content_urls.desktop.page
                    });
                }
                
                return images;
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
                        images.push({
                            url: pageData.thumbnail.source,
                            link: pageData.content_urls.desktop.page
                        });
                        
                        // Add higher resolution if available
                        if (pageData.originalimage && pageData.originalimage.source) {
                            images.push({
                                url: pageData.originalimage.source,
                                link: pageData.content_urls.desktop.page
                            });
                        }
                    }
                }
            }
        }
        
        if (images.length === 0) {
            console.log(`No Wikipedia images found for ${commonName}`);
        }
        
        return images;
    } catch (error) {
        console.error(`Error fetching Wikipedia images for ${commonName}:`, error);
        return [];
    }
}

/**
 * Try to fetch images using scientific name first, then common name as fallback
 * 
 * @param {string} commonName - Common name of the bird
 * @param {string} scientificName - Scientific name of the bird
 * @returns {Array} - Array of image objects or empty array if none found
 */
async function fetchBirdImagesWithFallback(commonName, scientificName) {
    // First try using scientific name with Commons API (most reliable)
    let images = [];
    
    if (scientificName) {
        images = await fetchBirdImagesFromCommons(scientificName);
    }
    
    // If that doesn't work, try the common name with Wikipedia
    if (images.length === 0) {
        console.log(`No Commons images found for ${scientificName}, trying Wikipedia with common name: ${commonName}`);
        images = await fetchBirdImagesFromWikipedia(commonName);
    }
    
    return images;
}

/**
 * Creates a card element for a bird
 * 
 * @param {string} commonName - Common name of the bird
 * @param {Array} images - Array of image information objects
 * @returns {HTMLElement} - The card element
 */
function createBirdCard(commonName, images) {
    const birdCard = document.createElement("div");
    birdCard.className = "bird-card";
    
    // Create image element
    const img = document.createElement("img");
    img.alt = commonName;
    
    // Use a placeholder initially
    img.src = `https://placehold.co/300x200?text=${encodeURIComponent(commonName)}`;
    
    // Add error handling for image loading failures
    img.onerror = function() {
        console.log(`Failed to load image for ${commonName}, using placeholder`);
        this.src = `https://placehold.co/300x200?text=${encodeURIComponent(commonName)}`;
    };
    
    // If we already have images, use them
    const hasImages = images && images.length > 0;
    if (hasImages) {
        img.src = images[0].url;
        
        // Add click handler for multiple images
        if (images.length > 1) {
            img.style.cursor = 'pointer';
            
            // Store the image collection and current index
            birdCard.dataset.currentImageIndex = "0";
            birdCard.dataset.imageCount = images.length.toString();
            
            // Store the images array directly on the card element
            birdCard._images = images;
            
            // Add click handler to cycle images
            img.addEventListener('click', function(event) {
                event.preventDefault(); // Prevent navigation
                
                const card = this.parentNode;
                const currentIndex = parseInt(card.dataset.currentImageIndex);
                const imageCount = parseInt(card.dataset.imageCount);
                
                // Calculate next index with wrap-around
                const nextIndex = (currentIndex + 1) % imageCount;
                
                // Update the image source
                this.src = card._images[nextIndex].url;
                
                // Update the current index
                card.dataset.currentImageIndex = nextIndex.toString();
                
                console.log(`Showing image ${nextIndex + 1}/${imageCount} for ${commonName}`);
            });
        }
    }
    
    // Create link element - always to Wikipedia
    const link = document.createElement("a");
    link.href = `https://en.wikipedia.org/wiki/${commonName.replace(/ /g, "_")}`;
    link.target = "_blank"; // Open in new tab
    link.rel = "noopener noreferrer"; // Added for security best practices
    link.textContent = commonName;
    
    // Assemble the card
    birdCard.appendChild(img);
    birdCard.appendChild(link);
    
    return birdCard;
}

// Remove the indicator dot code from createBirdCard function
// (Delete the entire block that creates the indicator element)

// Add this function to create instructions
function addInstructions() {
    const container = document.getElementById("birds-container");
    const instructions = document.createElement("div");
    instructions.className = "instructions";
    instructions.innerHTML = "<p>Click any bird image to view alternative photos when available.</p><p>Click any bird name to view wikipedia article.</p>";
    instructions.style.padding = "10px";
    instructions.style.marginBottom = "20px";
    instructions.style.backgroundColor = "#e9f5ff";
    instructions.style.borderRadius = "4px";
    instructions.style.gridColumn = "1 / -1";
    
    // Insert instructions at the beginning of the container
    container.insertBefore(instructions, container.firstChild);
}

/**
 * Loads bird data from JSON and creates the gallery with lazy loading for images
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
        
        const data = await response.json();
        container.innerHTML = ''; // Clear loading message
        
        // Add instructions for clicking images
        const instructions = document.createElement("div");
        instructions.className = "instructions";
        instructions.innerHTML = "<p>Click any bird image to view alternative photos when available.</p><p>Click any bird name to view wikipedia article.</p>";
        instructions.style.padding = "10px";
        instructions.style.marginBottom = "20px";
        instructions.style.backgroundColor = "#e9f5ff";
        instructions.style.borderRadius = "4px";
        instructions.style.gridColumn = "1 / -1";
        container.appendChild(instructions);
        
        // Update page title and description from JSON if available
        if (data.title) {
            document.title = data.title;
            const pageTitle = document.querySelector('h1');
            if (pageTitle) pageTitle.textContent = data.title;
        }
        
        if (data.description) {
            const descriptionElement = document.querySelector('p');
            if (descriptionElement) descriptionElement.textContent = data.description;
        }

        // Process each category of birds (exclude title and description properties)
        const categories = Object.entries(data).filter(([key]) => 
            key !== 'title' && key !== 'description');
            
        // First pass: Create all cards with placeholders
        for (const [category, birds] of categories) {
            // Create category header
            const categoryTitle = document.createElement("div");
            categoryTitle.className = "category";
            categoryTitle.innerText = category;
            container.appendChild(categoryTitle);
            
            // Create placeholder cards for all birds
            for (const bird of birds) {
                // Create a card with placeholder image
                const card = createBirdCard(bird.common_name, []);
                card.dataset.commonName = bird.common_name;
                card.dataset.scientificName = bird.scientific_name || '';
                container.appendChild(card);
            }
        }
        
        // Second pass: Load images asynchronously
        setTimeout(async () => {
            const cards = document.querySelectorAll('.bird-card');
            for (const card of cards) {
                try {
                    const commonName = card.dataset.commonName;
                    const scientificName = card.dataset.scientificName;
                    
                    // Fetch images
                    const images = await fetchBirdImagesWithFallback(commonName, scientificName);
                    
                    if (images && images.length > 0) {
                        // Update the image
                        const img = card.querySelector('img');
                        if (img) {
                            img.src = images[0].url;
                            
                            // Set up click handler for multiple images
                            if (images.length > 1) {
                                img.style.cursor = 'pointer';
                                card.dataset.currentImageIndex = "0";
                                card.dataset.imageCount = images.length.toString();
                                card._images = images;
                                
                                // Add click handler to cycle images
                                img.addEventListener('click', function(event) {
                                    event.preventDefault();
                                    const card = this.parentNode;
                                    const currentIndex = parseInt(card.dataset.currentImageIndex);
                                    const imageCount = parseInt(card.dataset.imageCount);
                                    const nextIndex = (currentIndex + 1) % imageCount;
                                    this.src = card._images[nextIndex].url;
                                    card.dataset.currentImageIndex = nextIndex.toString();
                                });
                            }
                        }
                    }
                    
                    // Small delay to prevent overwhelming APIs
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`Error loading images for ${card.dataset.commonName}:`, error);
                }
            }
        }, 100); // Start loading images shortly after the grid is rendered
        
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
/**
 * BIRDS OF COSTA RICA GALLERY
 * 
 * This script loads bird data from a JSON file and creates a visual gallery.
 * It uses Wikipedia's API with origin=* parameter to work around CORS restrictions.
 */

/**
 * Fetches a bird image using Wikipedia's API with CORS support
 * 
 * @param {string} birdName - Name of the bird to search for
 * @returns {Object|null} - Image information or null if not found
 */
async function fetchBirdImage(birdName) {
    try {
        console.log(`Fetching image for ${birdName}`);
        
        // APPROACH 1: Try pageimages API first (works with CORS when origin=* is added)
        // This gets the main/primary image from the page
        const pageImagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(birdName)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
        
        const pageImagesResponse = await fetch(pageImagesUrl);
        
        if (pageImagesResponse.ok) {
            const data = await pageImagesResponse.json();
            
            // Navigate through the response to find the image
            if (data.query && data.query.pages) {
                // Get the first page (there should only be one)
                const pageId = Object.keys(data.query.pages)[0];
                const page = data.query.pages[pageId];
                
                // Check if the page has a thumbnail
                if (page.thumbnail && page.thumbnail.source) {
                    console.log(`Found main image for ${birdName} using pageimages API`);
                    return {
                        url: page.thumbnail.source,
                        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(birdName.replace(/ /g, "_"))}`
                    };
                }
            }
        }
        
        // APPROACH 2: If pageimages fails, try the images API to get a list of all images
        const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(birdName)}&prop=images&format=json&origin=*`;
        
        const imagesResponse = await fetch(imagesUrl);
        
        if (imagesResponse.ok) {
            const data = await imagesResponse.json();
            
            if (data.query && data.query.pages) {
                const pageId = Object.keys(data.query.pages)[0];
                const page = data.query.pages[pageId];
                
                // If we have images, filter and find the best one
                if (page.images && page.images.length > 0) {
                    console.log(`Found ${page.images.length} images for ${birdName}, filtering for best match`);
                    
                    // Filter out non-image files
                    const filteredImages = page.images.filter(img => {
                        const title = img.title.toLowerCase();
                        return (title.includes('.jpg') || 
                                title.includes('.jpeg') || 
                                title.includes('.png') || 
                                title.includes('.svg')) &&
                                !title.includes('icon') &&
                                !title.includes('logo') &&
                                !title.includes('map') &&
                                !title.includes('range') &&
                                !title.includes('distribution');
                    });
                    
                    // Sort by relevance - prefer images that include the bird name
                    const birdNameLower = birdName.toLowerCase();
                    const sortedImages = filteredImages.sort((a, b) => {
                        const aHasName = a.title.toLowerCase().includes(birdNameLower);
                        const bHasName = b.title.toLowerCase().includes(birdNameLower);
                        
                        if (aHasName && !bHasName) return -1;
                        if (!aHasName && bHasName) return 1;
                        return 0;
                    });
                    
                    // If we have at least one image, get its URL
                    if (sortedImages.length > 0) {
                        // Now we need to get the URL of this image - we only have the title at this point
                        const selectedImage = sortedImages[0];
                        
                        // Get the image URL using imageinfo
                        const imageInfoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(selectedImage.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
                        
                        const imageInfoResponse = await fetch(imageInfoUrl);
                        
                        if (imageInfoResponse.ok) {
                            const imageData = await imageInfoResponse.json();
                            
                            if (imageData.query && imageData.query.pages) {
                                const imgPageId = Object.keys(imageData.query.pages)[0];
                                const imgPage = imageData.query.pages[imgPageId];
                                
                                if (imgPage.imageinfo && imgPage.imageinfo.length > 0) {
                                    console.log(`Found image for ${birdName}: ${imgPage.imageinfo[0].url}`);
                                    
                                    return {
                                        url: imgPage.imageinfo[0].url,
                                        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(birdName.replace(/ /g, "_"))}`
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`No suitable image found for ${birdName}`);
        return null;
    } catch (error) {
        console.error(`Error fetching image for ${birdName}:`, error);
        return null;
    }
}

/**
 * Try to fetch an image using scientific name if common name fails
 * 
 * @param {string} commonName - Common name of the bird
 * @param {string} scientificName - Scientific name of the bird
 * @returns {Object|null} - Image information or null if not found
 */
async function fetchBirdImageWithFallback(commonName, scientificName) {
    // First try the common name
    let imageInfo = await fetchBirdImage(commonName);
    
    // If that doesn't work and we have a scientific name, try that
    if (!imageInfo && scientificName) {
        console.log(`No image found for ${commonName}, trying scientific name: ${scientificName}`);
        imageInfo = await fetchBirdImage(scientificName);
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
                    
                    // Fetch the image for this bird
                    const imageInfo = await fetchBirdImageWithFallback(
                        bird.common_name, 
                        bird.scientific_name
                    );
                    
                    // Create a card for this bird
                    const card = createBirdCard(bird.common_name, imageInfo);
                    container.appendChild(card);
                    
                    // Add a small delay between requests to avoid overwhelming Wikipedia
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
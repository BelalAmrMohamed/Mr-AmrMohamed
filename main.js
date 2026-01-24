// ===================================
// MOBILE MENU TOGGLE
// ===================================
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.getElementById('navLinks');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (navLinks.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
}

// Close mobile menu when clicking on a link
const navLinksItems = document.querySelectorAll('.nav-link');
navLinksItems.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-wrapper')) {
        navLinks.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ===================================
// NAVBAR SCROLL EFFECT
// ===================================
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Add shadow when scrolled
    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// ===================================
// SMOOTH SCROLLING FOR ANCHOR LINKS
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Don't prevent default for empty hash
        if (href === '#') {
            e.preventDefault();
            return;
        }
        
        const target = document.querySelector(href);
        
        if (target) {
            e.preventDefault();
            
            const navbarHeight = navbar.offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===================================
// ACTIVE NAVIGATION HIGHLIGHTING
// ===================================
const sections = document.querySelectorAll('section[id]');

function highlightNavigation() {
    const scrollPosition = window.pageYOffset + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        
        if (navLink) {
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLink.style.color = 'var(--rich-gold)';
            } else {
                navLink.style.color = '';
            }
        }
    });
}

window.addEventListener('scroll', highlightNavigation);
window.addEventListener('load', highlightNavigation);

// ===================================
// CONTACT FORM HANDLING
// ===================================
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            service: document.getElementById('service').value,
            message: document.getElementById('message').value
        };
        
        // Show loading state
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = 'Sending...';
        submitButton.disabled = true;
        
        // Simulate form submission (replace with actual backend endpoint)
        try {
            // For demonstration, we'll use a timeout to simulate API call
            // In production, replace this with actual fetch to your backend
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Create WhatsApp message with form data
            const whatsappMessage = `Hello Mr. Amr, 

New contact form submission:

Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone || 'Not provided'}
Service: ${formData.service || 'Not specified'}

Message:
${formData.message}`;
            
            const whatsappURL = `https://wa.me/201550899245?text=${encodeURIComponent(whatsappMessage)}`;
            
            // Show success message
            formMessage.textContent = 'Thank you for your message! Redirecting to WhatsApp...';
            formMessage.className = 'form-message success';
            
            // Reset form
            contactForm.reset();
            
            // Redirect to WhatsApp after 2 seconds
            setTimeout(() => {
                window.open(whatsappURL, '_blank');
                formMessage.textContent = 'Message sent via WhatsApp!';
            }, 2000);
            
        } catch (error) {
            // Show error message
            formMessage.textContent = 'There was an error sending your message. Please try contacting via WhatsApp directly.';
            formMessage.className = 'form-message error';
            
            console.error('Form submission error:', error);
        } finally {
            // Reset button
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            
            // Hide message after 5 seconds
            setTimeout(() => {
                formMessage.style.display = 'none';
                formMessage.className = 'form-message';
            }, 5000);
        }
    });
}

// ===================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ===================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe pillar cards for fade-in animation
document.addEventListener('DOMContentLoaded', () => {
    const pillarCards = document.querySelectorAll('.pillar-card');
    const credentialItems = document.querySelectorAll('.credential-item');
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    // Set initial state
    [...pillarCards, ...credentialItems, ...timelineItems].forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    // Observe elements
    pillarCards.forEach(card => observer.observe(card));
    credentialItems.forEach(item => observer.observe(item));
    timelineItems.forEach(item => observer.observe(item));
});

// ===================================
// VIDEO LAZY LOADING (OPTIONAL)
// ===================================
const videoContainer = document.getElementById('videoContainer');
const youtubePlayer = document.getElementById('youtubePlayer');

// Optional: Only load video when user scrolls to it
if (videoContainer && youtubePlayer) {
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Video is in viewport, it's already loaded
                // You could add additional functionality here if needed
                videoObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    videoObserver.observe(videoContainer);
}

// ===================================
// SCROLL TO TOP FUNCTIONALITY
// ===================================
let scrollToTopButton = document.createElement('button');
scrollToTopButton.className = 'scroll-to-top';
scrollToTopButton.innerHTML = '↑';
scrollToTopButton.setAttribute('aria-label', 'Scroll to top');
scrollToTopButton.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 30px;
    width: 50px;
    height: 50px;
    background: var(--navy-blue);
    color: var(--rich-gold);
    border: 2px solid var(--rich-gold);
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 998;
    box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);
`;

document.body.appendChild(scrollToTopButton);

// Show/hide scroll to top button
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 500) {
        scrollToTopButton.style.opacity = '1';
        scrollToTopButton.style.visibility = 'visible';
    } else {
        scrollToTopButton.style.opacity = '0';
        scrollToTopButton.style.visibility = 'hidden';
    }
});

// Scroll to top when clicked
scrollToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

scrollToTopButton.addEventListener('mouseenter', () => {
    scrollToTopButton.style.background = 'var(--rich-gold)';
    scrollToTopButton.style.color = 'var(--navy-blue)';
    scrollToTopButton.style.transform = 'scale(1.1)';
});

scrollToTopButton.addEventListener('mouseleave', () => {
    scrollToTopButton.style.background = 'var(--navy-blue)';
    scrollToTopButton.style.color = 'var(--rich-gold)';
    scrollToTopButton.style.transform = 'scale(1)';
});

// ===================================
// PRELOAD CRITICAL RESOURCES
// ===================================
window.addEventListener('load', () => {
    // Remove any loading states
    document.body.classList.add('loaded');
    
    // Optional: Add any post-load animations or initializations
    console.log('Portfolio website loaded successfully!');
});

// ===================================
// HANDLE EXTERNAL LINKS
// ===================================
document.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.setAttribute('rel', 'noopener noreferrer');
});

// ===================================
// HANDLE FORM INPUT VALIDATION
// ===================================
const formInputs = document.querySelectorAll('.contact-form input, .contact-form textarea, .contact-form select');

formInputs.forEach(input => {
    // Add visual feedback on focus
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.01)';
    });
    
    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
        
        // Validate on blur
        if (input.hasAttribute('required') && !input.value.trim()) {
            input.style.borderColor = '#dc2626';
        } else {
            input.style.borderColor = '';
        }
    });
    
    // Reset border color on input
    input.addEventListener('input', () => {
        input.style.borderColor = '';
    });
});

// ===================================
// EMAIL VALIDATION HELPER
// ===================================
const emailInput = document.getElementById('email');
if (emailInput) {
    emailInput.addEventListener('blur', () => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailInput.value && !emailPattern.test(emailInput.value)) {
            emailInput.style.borderColor = '#dc2626';
        } else {
            emailInput.style.borderColor = '';
        }
    });
}

// ===================================
// PREVENT SPAM SUBMISSIONS
// ===================================
let lastSubmissionTime = 0;
const SUBMISSION_COOLDOWN = 3000; // 3 seconds

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        const currentTime = Date.now();
        if (currentTime - lastSubmissionTime < SUBMISSION_COOLDOWN) {
            e.preventDefault();
            formMessage.textContent = 'Please wait a moment before submitting again.';
            formMessage.className = 'form-message error';
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 3000);
            return false;
        }
        lastSubmissionTime = currentTime;
    });
}

// ===================================
// CONSOLE CREDITS
// ===================================
console.log('%c👨‍🏫 Amr Mohamed Ahmed - English Language Expert', 'color: #1e3a5f; font-size: 16px; font-weight: bold;');
console.log('%c32 Years of Excellence | AUC Certified Trainer', 'color: #c9a961; font-size: 12px;');
console.log('%cWebsite developed with modern best practices', 'color: #4a5568; font-size: 10px;');
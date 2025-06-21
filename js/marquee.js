// Update marquee text across all pages
document.addEventListener('DOMContentLoaded', function() {
    const marqueeElement = document.querySelector('.marquee span');
    if (marqueeElement) {
        marqueeElement.innerHTML = 'Welcome to <b>Aticas cafe\'</b> - Your Hospitality Partner - Fresh and Tasty Meals All the Time - Open Mon - Sat from 6am - 12am';
    }
}); 
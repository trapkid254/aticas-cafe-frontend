// Test script for cart functionality
console.log('=== Starting Cart Functionality Tests ===');

// Wait for cart functions to be available
function waitForCartFunctions() {
    return new Promise((resolve) => {
        const checkFunctions = () => {
            if (window.updateCartCount && window.updateCartItem && window.removeCartItem) {
                resolve();
            } else {
                setTimeout(checkFunctions, 100);
            }
        };
        checkFunctions();
    });
}

// Test 1: Test updateCartCount function
async function testUpdateCartCount() {
    console.log('\n--- Test 1: updateCartCount ---');
    try {
        const count = await updateCartCount();
        console.log(`Cart count: ${count}`);
        console.log('✅ Test 1 Passed: updateCartCount executed successfully');
        return true;
    } catch (error) {
        console.error('❌ Test 1 Failed:', error);
        return false;
    }
}

// Test 2: Test add item to cart
async function testAddToCart() {
    console.log('\n--- Test 2: Add Item to Cart ---');
    try {
        // Test with a valid menu item ID
        // Using a sample ID - replace with actual ID from your database
        const testItemId = '64f8b7e3b4d4a4e1f4d3b2a1';
        const result = await updateCartItem(testItemId, 1, 'food');
        console.log('Add to cart result:', result);
        console.log('✅ Test 2 Passed: Item added to cart');
        return true;
    } catch (error) {
        console.error('❌ Test 2 Failed:', error);
        return false;
    }
}

// Test 3: Test remove item from cart
async function testRemoveFromCart() {
    console.log('\n--- Test 3: Remove Item from Cart ---');
    try {
        // First add an item to remove
        const testItemId = '64f8b7e3b4d4a4e1f4d3b2a1'; // Same ID as in testAddToCart
        await updateCartItem(testItemId, 1, 'food');
        
        // Now remove it
        const result = await removeCartItem(testItemId, 'food');
        console.log('Remove from cart result:', result);
        console.log('✅ Test 3 Passed: Item removed from cart');
        return true;
    } catch (error) {
        console.error('❌ Test 3 Failed:', error);
        return false;
    }
}

// Test 4: Test cart total calculation
async function testCartTotal() {
    console.log('\n--- Test 4: Cart Total Calculation ---');
    try {
        // Clear cart first
        localStorage.setItem('guestCart', JSON.stringify({ items: [] }));
        
        // Add test items
        const testItems = [
            { id: 'item1', price: 100, quantity: 2 },
            { id: 'item2', price: 50, quantity: 3 }
        ];
        
        for (const item of testItems) {
            await updateCartItem(item.id, item.quantity, 'food', null, item.price);
        }
        
        const cart = JSON.parse(localStorage.getItem('guestCart') || '{}');
        const calculatedTotal = cart.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        console.log(`Expected total: 350, Actual total: ${calculatedTotal}`);
        const passed = calculatedTotal === 350;
        console.log(passed ? '✅ Test 4 Passed' : '❌ Test 4 Failed');
        return passed;
    } catch (error) {
        console.error('❌ Test 4 Failed:', error);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    const results = [];
    
    results.push(await testUpdateCartCount());
    results.push(await testAddToCart());
    results.push(await testRemoveFromCart());
    results.push(await testCartTotal());
    
    const passedTests = results.filter(Boolean).length;
    const totalTests = results.length;
    
    console.log('\n=== Test Summary ===');
    console.log(`✅ ${passedTests} out of ${totalTests} tests passed`);
    if (passedTests < totalTests) {
        console.log('❌ Some tests failed. Check the logs above for details.');
    } else {
        console.log('🎉 All tests passed!');
    }
}

// Initialize tests when the page loads
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        try {
            await waitForCartFunctions();
            console.log('All cart functions are available, starting tests...');
            await runAllTests();
        } catch (error) {
            console.error('Error initializing tests:', error);
        }
    });
}

// Make runAllTests available globally for manual testing
window.runCartTests = async () => {
    try {
        await waitForCartFunctions();
        return await runAllTests();
    } catch (error) {
        console.error('Error running cart tests:', error);
        return false;
    }
};

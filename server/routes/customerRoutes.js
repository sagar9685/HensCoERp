const express = require('express');
const router = express.Router();
const customerController = require('../controller/customerController')

router.post('/add',customerController.addCustomer);
router.get('/',customerController.getCustomers);
router.get('/search', customerController.searchCustomersByName);
router.put('/update/:id',customerController.updateCustomer)

module.exports=router;
// import UserFooter from "./UserFooter";
// import UserNavbar from "./UserNavBar";
import styles from "./UserDashboard.module.css";

// const UserDashboard = () => {
//   return (
//     <>
//       <div className="container-fluid">
//         <UserNavbar />
//         <div className={styles.mainContainer}>
//           <div className={styles.contentWrapper}>

//             {/* Stats Cards */}
//             <div className="row">
//               <div className="col-xl-3 col-sm-6 grid-margin stretch-card">
//                 <div className={`card ${styles.statCard}`}>
//                   <div className="card-body">
//                     <div className="row">
//                       <div className="col-9">
//                         <div className="d-flex align-items-center align-self-start">
//                           <h3 className="mb-0">156</h3>
//                           <p className={`${styles.positive} ml-2 mb-0 font-weight-medium`}>+12.5%</p>
//                         </div>
//                       </div>
//                       <div className="col-3">
//                         <div className={`${styles.iconBox} ${styles.iconBoxSuccess}`}>
//                           <span className="mdi mdi-package-variant"></span>
//                         </div>
//                       </div>
//                     </div>
//                     <h6 className={styles.statLabel}>Total Stocks</h6>
//                   </div>
//                 </div>
//               </div>

//               <div className="col-xl-3 col-sm-6 grid-margin stretch-card">
//                 <div className={`card ${styles.statCard}`}>
//                   <div className="card-body">
//                     <div className="row">
//                       <div className="col-9">
//                         <div className="d-flex align-items-center align-self-start">
//                           <h3 className="mb-0">24</h3>
//                           <p className={`${styles.warning} ml-2 mb-0 font-weight-medium`}>Pending</p>
//                         </div>
//                       </div>
//                       <div className="col-3">
//                         <div className={`${styles.iconBox} ${styles.iconBoxWarning}`}>
//                           <span className="mdi mdi-clock-outline"></span>
//                         </div>
//                       </div>
//                     </div>
//                     <h6 className={styles.statLabel}>Pending Orders</h6>
//                   </div>
//                 </div>
//               </div>

//               <div className="col-xl-3 col-sm-6 grid-margin stretch-card">
//                 <div className={`card ${styles.statCard}`}>
//                   <div className="card-body">
//                     <div className="row">
//                       <div className="col-9">
//                         <div className="d-flex align-items-center align-self-start">
//                           <h3 className="mb-0">$2,450</h3>
//                           <p className={`${styles.positive} ml-2 mb-0 font-weight-medium`}>+8.3%</p>
//                         </div>
//                       </div>
//                       <div className="col-3">
//                         <div className={`${styles.iconBox} ${styles.iconBoxInfo}`}>
//                           <span className="mdi mdi-cash-multiple"></span>
//                         </div>
//                       </div>
//                     </div>
//                     <h6 className={styles.statLabel}>Delivery Cash</h6>
//                   </div>
//                 </div>
//               </div>

//               <div className="col-xl-3 col-sm-6 grid-margin stretch-card">
//                 <div className={`card ${styles.statCard}`}>
//                   <div className="card-body">
//                     <div className="row">
//                       <div className="col-9">
//                         <div className="d-flex align-items-center align-self-start">
//                           <h3 className="mb-0">$15,230</h3>
//                           <p className={`${styles.positive} ml-2 mb-0 font-weight-medium`}>+15.2%</p>
//                         </div>
//                       </div>
//                       <div className="col-3">
//                         <div className={`${styles.iconBox} ${styles.iconBoxSuccess}`}>
//                           <span className="mdi mdi-chart-line"></span>
//                         </div>
//                       </div>
//                     </div>
//                     <h6 className={styles.statLabel}>Monthly Sales</h6>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Charts and Recent Orders */}
//             <div className="row">
//               <div className="col-md-8 grid-margin stretch-card">
//                 <div className={`card ${styles.chartCard}`}>
//                   <div className="card-body">
//                     <div className="d-flex flex-row justify-content-between">
//                       <h4 className="card-title mb-1">Sales Analytics</h4>
//                       <div className="dropdown">
//                         <button className={`btn btn-sm ${styles.dropdownBtn}`} type="button" data-toggle="dropdown">
//                           Last 7 Days <span className="mdi mdi-chevron-down"></span>
//                         </button>
//                         <div className="dropdown-menu">
//                           <a className="dropdown-item" href="#">Last 7 Days</a>
//                           <a className="dropdown-item" href="#">Last 30 Days</a>
//                           <a className="dropdown-item" href="#">Last Year</a>
//                         </div>
//                       </div>
//                     </div>
//                     <div className={styles.chartContainer}>
//                       {/* This would be replaced with actual chart library like Chart.js or Recharts */}
//                       <div className={styles.mockChart}>
//                         <div className={styles.chartBar} style={{height: '80%'}}></div>
//                         <div className={styles.chartBar} style={{height: '60%'}}></div>
//                         <div className={styles.chartBar} style={{height: '90%'}}></div>
//                         <div className={styles.chartBar} style={{height: '70%'}}></div>
//                         <div className={styles.chartBar} style={{height: '85%'}}></div>
//                         <div className={styles.chartBar} style={{height: '95%'}}></div>
//                         <div className={styles.chartBar} style={{height: '65%'}}></div>
//                       </div>
//                       <div className={styles.chartLabels}>
//                         <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="col-md-4 grid-margin stretch-card">
//                 <div className={`card ${styles.orderCard}`}>
//                   <div className="card-body">
//                     <h4 className="card-title mb-4">Recent Orders</h4>
//                     <div className={styles.orderList}>
//                       <div className={`${styles.orderItem} ${styles.pending}`}>
//                         <div className={styles.orderIcon}>
//                           <span className="mdi mdi-clock"></span>
//                         </div>
//                         <div className={styles.orderDetails}>
//                           <h6>Order #ORD-0012</h6>
//                           <p className={styles.orderTime}>10 min ago</p>
//                           <p className={styles.orderAmount}>$245.00</p>
//                         </div>
//                       </div>

//                       <div className={`${styles.orderItem} ${styles.processing}`}>
//                         <div className={styles.orderIcon}>
//                           <span className="mdi mdi-truck-delivery"></span>
//                         </div>
//                         <div className={styles.orderDetails}>
//                           <h6>Order #ORD-0011</h6>
//                           <p className={styles.orderTime}>25 min ago</p>
//                           <p className={styles.orderAmount}>$189.50</p>
//                         </div>
//                       </div>

//                       <div className={`${styles.orderItem} ${styles.delivered}`}>
//                         <div className={styles.orderIcon}>
//                           <span className="mdi mdi-check-circle"></span>
//                         </div>
//                         <div className={styles.orderDetails}>
//                           <h6>Order #ORD-0010</h6>
//                           <p className={styles.orderTime}>1 hour ago</p>
//                           <p className={styles.orderAmount}>$325.75</p>
//                         </div>
//                       </div>

//                       <div className={`${styles.orderItem} ${styles.pending}`}>
//                         <div className={styles.orderIcon}>
//                           <span className="mdi mdi-clock"></span>
//                         </div>
//                         <div className={styles.orderDetails}>
//                           <h6>Order #ORD-0009</h6>
//                           <p className={styles.orderTime}>2 hours ago</p>
//                           <p className={styles.orderAmount}>$145.00</p>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Delivery Boys & Stock Status */}
//             <div className="row">
//               <div className="col-md-6 grid-margin stretch-card">
//                 <div className={`card ${styles.deliveryCard}`}>
//                   <div className="card-body">
//                     <h4 className="card-title mb-4">Delivery Boys Status</h4>
//                     <div className="table-responsive">
//                       <table className={`table ${styles.deliveryTable}`}>
//                         <thead>
//                           <tr>
//                             <th>Name</th>
//                             <th>Orders Today</th>
//                             <th>Cash Collected</th>
//                             <th>Status</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           <tr>
//                             <td className={styles.deliveryBoy}>
//                               <img src="/api/placeholder/32/32" alt="John" />
//                               <span>John Doe</span>
//                             </td>
//                             <td>12</td>
//                             <td>$1,240</td>
//                             <td><span className={`badge ${styles.activeBadge}`}>Active</span></td>
//                           </tr>
//                           <tr>
//                             <td className={styles.deliveryBoy}>
//                               <img src="/api/placeholder/32/32" alt="Mike" />
//                               <span>Mike Smith</span>
//                             </td>
//                             <td>8</td>
//                             <td>$890</td>
//                             <td><span className={`badge ${styles.activeBadge}`}>Active</span></td>
//                           </tr>
//                           <tr>
//                             <td className={styles.deliveryBoy}>
//                               <img src="/api/placeholder/32/32" alt="Sarah" />
//                               <span>Sarah Johnson</span>
//                             </td>
//                             <td>15</td>
//                             <td>$1,560</td>
//                             <td><span className={`badge ${styles.offlineBadge}`}>Break</span></td>
//                           </tr>
//                           <tr>
//                             <td className={styles.deliveryBoy}>
//                               <img src="/api/placeholder/32/32" alt="Alex" />
//                               <span>Alex Wilson</span>
//                             </td>
//                             <td>6</td>
//                             <td>$620</td>
//                             <td><span className={`badge ${styles.activeBadge}`}>Active</span></td>
//                           </tr>
//                         </tbody>
//                       </table>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="col-md-6 grid-margin stretch-card">
//                 <div className={`card ${styles.stockCard}`}>
//                   <div className="card-body">
//                     <h4 className="card-title mb-4">Stock Status</h4>
//                     <div className={styles.stockList}>
//                       <div className={styles.stockItem}>
//                         <div className={styles.stockInfo}>
//                           <h6>iPhone 14 Pro</h6>
//                           <p>Electronics</p>
//                         </div>
//                         <div className={styles.stockLevel}>
//                           <div className={styles.progressBar}>
//                             <div className={`${styles.progressFill} ${styles.highStock}`} style={{width: '75%'}}></div>
//                           </div>
//                           <span className={styles.stockCount}>45/60</span>
//                         </div>
//                       </div>

//                       <div className={styles.stockItem}>
//                         <div className={styles.stockInfo}>
//                           <h6>Nike Air Max</h6>
//                           <p>Footwear</p>
//                         </div>
//                         <div className={styles.stockLevel}>
//                           <div className={styles.progressBar}>
//                             <div className={`${styles.progressFill} ${styles.mediumStock}`} style={{width: '45%'}}></div>
//                           </div>
//                           <span className={styles.stockCount}>27/60</span>
//                         </div>
//                       </div>

//                       <div className={styles.stockItem}>
//                         <div className={styles.stockInfo}>
//                           <h6>Coffee Maker</h6>
//                           <p>Home Appliances</p>
//                         </div>
//                         <div className={styles.stockLevel}>
//                           <div className={styles.progressBar}>
//                             <div className={`${styles.progressFill} ${styles.lowStock}`} style={{width: '20%'}}></div>
//                           </div>
//                           <span className={styles.stockCount}>12/60</span>
//                         </div>
//                       </div>

//                       <div className={styles.stockItem}>
//                         <div className={styles.stockInfo}>
//                           <h6>Wireless Earbuds</h6>
//                           <p>Electronics</p>
//                         </div>
//                         <div className={styles.stockLevel}>
//                           <div className={styles.progressBar}>
//                             <div className={`${styles.progressFill} ${styles.criticalStock}`} style={{width: '10%'}}></div>
//                           </div>
//                           <span className={styles.stockCount}>6/60</span>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Pending Orders Table */}
//             <div className="row">
//               <div className="col-12 grid-margin">
//                 <div className={`card ${styles.ordersTableCard}`}>
//                   <div className="card-body">
//                     <div className="d-flex justify-content-between align-items-center mb-4">
//                       <h4 className="card-title mb-0">Pending Orders</h4>
//                       <button className={`btn ${styles.viewAllBtn}`}>View All</button>
//                     </div>
//                     <div className="table-responsive">
//                       <table className={`table ${styles.ordersTable}`}>
//                         <thead>
//                           <tr>
//                             <th>Order ID</th>
//                             <th>Customer</th>
//                             <th>Products</th>
//                             <th>Amount</th>
//                             <th>Payment</th>
//                             <th>Status</th>
//                             <th>Action</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           <tr>
//                             <td>#ORD-0012</td>
//                             <td className={styles.customerCell}>
//                               <img src="/api/placeholder/36/36" alt="Customer" />
//                               <span>Robert Johnson</span>
//                             </td>
//                             <td>2 Items</td>
//                             <td>$245.00</td>
//                             <td>Cash on Delivery</td>
//                             <td><span className={`badge ${styles.pendingBadge}`}>Pending</span></td>
//                             <td>
//                               <button className={`btn btn-sm ${styles.actionBtn}`}>Process</button>
//                             </td>
//                           </tr>
//                           <tr>
//                             <td>#ORD-0011</td>
//                             <td className={styles.customerCell}>
//                               <img src="/api/placeholder/36/36" alt="Customer" />
//                               <span>Emma Wilson</span>
//                             </td>
//                             <td>1 Item</td>
//                             <td>$89.50</td>
//                             <td>Credit Card</td>
//                             <td><span className={`badge ${styles.processingBadge}`}>Processing</span></td>
//                             <td>
//                               <button className={`btn btn-sm ${styles.actionBtn}`}>Dispatch</button>
//                             </td>
//                           </tr>
//                           <tr>
//                             <td>#ORD-0010</td>
//                             <td className={styles.customerCell}>
//                               <img src="/api/placeholder/36/36" alt="Customer" />
//                               <span>Michael Brown</span>
//                             </td>
//                             <td>3 Items</td>
//                             <td>$325.75</td>
//                             <td>PayPal</td>
//                             <td><span className={`badge ${styles.pendingBadge}`}>Pending</span></td>
//                             <td>
//                               <button className={`btn btn-sm ${styles.actionBtn}`}>Process</button>
//                             </td>
//                           </tr>
//                           <tr>
//                             <td>#ORD-0009</td>
//                             <td className={styles.customerCell}>
//                               <img src="/api/placeholder/36/36" alt="Customer" />
//                               <span>Sophia Garcia</span>
//                             </td>
//                             <td>1 Item</td>
//                             <td>$145.00</td>
//                             <td>Cash on Delivery</td>
//                             <td><span className={`badge ${styles.processingBadge}`}>Processing</span></td>
//                             <td>
//                               <button className={`btn btn-sm ${styles.actionBtn}`}>Dispatch</button>
//                             </td>
//                           </tr>
//                         </tbody>
//                       </table>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//           </div>
//           <UserFooter />
//         </div>
//       </div>
//     </>
//   );
// };

// export default UserDashboard;

const UserDashboard = () => {
  return (
    <>
      <h1 className={styles.head}>Dashboard work in progress....</h1>
    </>
  );
};

export default UserDashboard;

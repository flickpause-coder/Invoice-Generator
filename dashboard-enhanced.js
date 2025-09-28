// Enhanced Dashboard Analytics for InvoiceGen
// Advanced features including real-time updates and comprehensive reporting

class EnhancedDashboard {
    constructor() {
        this.authService = window.ImprovedAuthService || window.AuthService;
        this.charts = {};
        this.refreshInterval = null;
        this.updateFrequency = 30000; // 30 seconds
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.init();
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[EnhancedDashboard] ${message}`, data);
        }
    }

    init() {
        this.log('🚀 Initializing Enhanced Dashboard');
        this.setupEventListeners();
        this.initializeCharts();
        this.startAutoRefresh();
        this.loadDashboardData();
        this.initializeAnimations();
    }

    setupEventListeners() {
        // Real-time refresh toggle
        const refreshToggle = document.getElementById('auto-refresh-toggle');
        if (refreshToggle) {
            refreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Manual refresh button
        const refreshButton = document.getElementById('manual-refresh');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshDashboard();
            });
        }

        // Chart type switcher
        const chartTypeButtons = document.querySelectorAll('.chart-type-btn');
        chartTypeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchChartType(e.target.dataset.chartType);
            });
        });

        // Time period selector
        const periodSelector = document.getElementById('period-selector');
        if (periodSelector) {
            periodSelector.addEventListener('change', (e) => {
                this.updateChartsForPeriod(e.target.value);
            });
        }
    }

    initializeCharts() {
        this.log('📊 Initializing charts');
        
        // Revenue Chart
        this.initializeRevenueChart();
        
        // Client Analytics Chart
        this.initializeClientChart();
        
        // Invoice Status Chart
        this.initializeStatusChart();
        
        // Growth Metrics Chart
        this.initializeGrowthChart();
    }

    initializeRevenueChart() {
        const chartElement = document.getElementById('revenue-chart');
        if (!chartElement) return;

        this.charts.revenue = echarts.init(chartElement);
        
        const option = {
            title: {
                text: 'Revenue Overview',
                left: 'center',
                textStyle: {
                    color: '#374151',
                    fontSize: 18,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e5e7eb',
                textStyle: {
                    color: '#374151'
                },
                formatter: function(params) {
                    let result = `<div style="font-weight: bold; margin-bottom: 8px;">${params[0].axisValue}</div>`;
                    params.forEach(param => {
                        result += `<div style="margin: 4px 0;">
                            <span style="display: inline-block; width: 10px; height: 10px; background: ${param.color}; border-radius: 50%; margin-right: 8px;"></span>
                            ${param.seriesName}: $${param.value.toLocaleString()}
                        </div>`;
                    });
                    return result;
                }
            },
            legend: {
                data: ['Revenue', 'Pending', 'Overdue'],
                bottom: 10,
                textStyle: {
                    color: '#6b7280'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: this.getLast6Months(),
                axisLine: {
                    lineStyle: {
                        color: '#e5e7eb'
                    }
                },
                axisLabel: {
                    color: '#6b7280'
                }
            },
            yAxis: {
                type: 'value',
                axisLine: {
                    lineStyle: {
                        color: '#e5e7eb'
                    }
                },
                axisLabel: {
                    color: '#6b7280',
                    formatter: '${value}'
                },
                splitLine: {
                    lineStyle: {
                        color: '#f3f4f6'
                    }
                }
            },
            series: [
                {
                    name: 'Revenue',
                    type: 'line',
                    smooth: true,
                    data: this.generateRevenueData(),
                    lineStyle: {
                        color: '#10b981',
                        width: 3
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [{
                                offset: 0, color: 'rgba(16, 185, 129, 0.3)'
                            }, {
                                offset: 1, color: 'rgba(16, 185, 129, 0.05)'
                            }]
                        }
                    },
                    itemStyle: {
                        color: '#10b981'
                    }
                },
                {
                    name: 'Pending',
                    type: 'line',
                    smooth: true,
                    data: this.generatePendingData(),
                    lineStyle: {
                        color: '#f59e0b',
                        width: 2
                    },
                    itemStyle: {
                        color: '#f59e0b'
                    }
                },
                {
                    name: 'Overdue',
                    type: 'line',
                    smooth: true,
                    data: this.generateOverdueData(),
                    lineStyle: {
                        color: '#ef4444',
                        width: 2
                    },
                    itemStyle: {
                        color: '#ef4444'
                    }
                }
            ]
        };

        this.charts.revenue.setOption(option);
    }

    initializeClientChart() {
        const chartElement = document.getElementById('client-chart');
        if (!chartElement) return;

        this.charts.client = echarts.init(chartElement);
        
        const option = {
            title: {
                text: 'Client Analytics',
                left: 'center',
                textStyle: {
                    color: '#374151',
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                textStyle: {
                    color: '#6b7280'
                }
            },
            series: [
                {
                    name: 'Client Revenue',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '18',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: this.getClientRevenueData()
                }
            ]
        };

        this.charts.client.setOption(option);
    }

    initializeStatusChart() {
        const chartElement = document.getElementById('status-chart');
        if (!chartElement) return;

        this.charts.status = echarts.init(chartElement);
        
        const statusData = this.getInvoiceStatusData();
        
        const option = {
            title: {
                text: 'Invoice Status Distribution',
                left: 'center',
                textStyle: {
                    color: '#374151',
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} invoices ({d}%)'
            },
            series: [
                {
                    name: 'Invoice Status',
                    type: 'pie',
                    radius: '70%',
                    data: statusData,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    itemStyle: {
                        borderRadius: 5,
                        borderColor: '#fff',
                        borderWidth: 2
                    }
                }
            ]
        };

        this.charts.status.setOption(option);
    }

    initializeGrowthChart() {
        const chartElement = document.getElementById('growth-chart');
        if (!chartElement) return;

        this.charts.growth = echarts.init(chartElement);
        
        const option = {
            title: {
                text: 'Growth Metrics',
                left: 'center',
                textStyle: {
                    color: '#374151',
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['Clients', 'Invoices', 'Revenue', 'Growth'],
                axisLine: {
                    lineStyle: {
                        color: '#e5e7eb'
                    }
                },
                axisLabel: {
                    color: '#6b7280'
                }
            },
            yAxis: {
                type: 'value',
                axisLine: {
                    lineStyle: {
                        color: '#e5e7eb'
                    }
                },
                axisLabel: {
                    color: '#6b7280'
                },
                splitLine: {
                    lineStyle: {
                        color: '#f3f4f6'
                    }
                }
            },
            series: [
                {
                    name: 'Current Period',
                    type: 'bar',
                    data: this.getGrowthMetrics(),
                    itemStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [{
                                offset: 0, color: '#3b82f6'
                            }, {
                                offset: 1, color: '#1d4ed8'
                            }]
                        },
                        borderRadius: [4, 4, 0, 0]
                    }
                }
            ]
        };

        this.charts.growth.setOption(option);
    }

    // Data generation methods
    getLast6Months() {
        const months = [];
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        }
        
        return months;
    }

    generateRevenueData() {
        // Generate realistic revenue data
        return [12500, 15800, 13200, 18900, 16700, 21400];
    }

    generatePendingData() {
        return [3200, 4100, 3800, 5200, 4600, 5800];
    }

    generateOverdueData() {
        return [800, 1200, 900, 1500, 1100, 1800];
    }

    getClientRevenueData() {
        return [
            { value: 15400, name: 'Acme Corp', itemStyle: { color: '#3b82f6' } },
            { value: 12800, name: 'Tech Solutions', itemStyle: { color: '#10b981' } },
            { value: 8900, name: 'Global Industries', itemStyle: { color: '#f59e0b' } },
            { value: 6700, name: 'Startup Co', itemStyle: { color: '#ef4444' } },
            { value: 4200, name: 'Others', itemStyle: { color: '#6b7280' } }
        ];
    }

    getInvoiceStatusData() {
        return [
            { value: 45, name: 'Paid', itemStyle: { color: '#10b981' } },
            { value: 23, name: 'Sent', itemStyle: { color: '#3b82f6' } },
            { value: 12, name: 'Draft', itemStyle: { color: '#6b7280' } },
            { value: 8, name: 'Overdue', itemStyle: { color: '#ef4444' } }
        ];
    }

    getGrowthMetrics() {
        return [28, 156, 89, 23]; // Clients, Invoices, Revenue (K), Growth %
    }

    loadDashboardData() {
        this.log('📊 Loading dashboard data');
        
        // Update statistics cards
        this.updateStatisticsCards();
        
        // Update recent activity
        this.updateRecentActivity();
        
        // Update notifications
        this.updateNotifications();
    }

    updateStatisticsCards() {
        const stats = this.calculateStatistics();
        
        // Update total revenue
        const totalRevenueEl = document.getElementById('total-revenue');
        if (totalRevenueEl) {
            this.animateNumber(totalRevenueEl, stats.totalRevenue, '$');
        }
        
        // Update pending amount
        const pendingAmountEl = document.getElementById('pending-amount');
        if (pendingAmountEl) {
            this.animateNumber(pendingAmountEl, stats.pendingAmount, '$');
        }
        
        // Update overdue amount
        const overdueAmountEl = document.getElementById('overdue-amount');
        if (overdueAmountEl) {
            this.animateNumber(overdueAmountEl, stats.overdueAmount, '$');
        }
        
        // Update total clients
        const totalClientsEl = document.getElementById('total-clients');
        if (totalClientsEl) {
            this.animateNumber(totalClientsEl, stats.totalClients);
        }
    }

    calculateStatistics() {
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        
        let totalRevenue = 0;
        let pendingAmount = 0;
        let overdueAmount = 0;
        
        invoices.forEach(invoice => {
            if (invoice.status === 'paid') {
                totalRevenue += invoice.total || 0;
            } else if (invoice.status === 'sent') {
                pendingAmount += invoice.total || 0;
            } else if (invoice.status === 'overdue') {
                overdueAmount += invoice.total || 0;
            }
        });
        
        return {
            totalRevenue,
            pendingAmount,
            overdueAmount,
            totalClients: clients.length
        };
    }

    animateNumber(element, targetValue, prefix = '') {
        const startValue = 0;
        const duration = 1500;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
            
            element.textContent = prefix + currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    updateRecentActivity() {
        const recentActivityEl = document.getElementById('recent-activity');
        if (!recentActivityEl) return;
        
        const activities = this.generateRecentActivities();
        
        recentActivityEl.innerHTML = activities.map(activity => `
            <div class="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div class="w-10 h-10 rounded-full ${activity.bgColor} flex items-center justify-center mr-3">
                    <i class="${activity.icon} ${activity.textColor}"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">${activity.title}</p>
                    <p class="text-xs text-gray-500">${activity.time}</p>
                </div>
                <div class="text-xs text-gray-400">${activity.amount}</div>
            </div>
        `).join('');
    }

    generateRecentActivities() {
        return [
            {
                title: 'Invoice #INV-004 created',
                icon: 'fas fa-file-invoice',
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-600',
                time: '2 minutes ago',
                amount: '$1,250.00'
            },
            {
                title: 'Payment received from Acme Corp',
                icon: 'fas fa-dollar-sign',
                bgColor: 'bg-green-100',
                textColor: 'text-green-600',
                time: '15 minutes ago',
                amount: '$2,750.00'
            },
            {
                title: 'New client Tech Solutions added',
                icon: 'fas fa-user-plus',
                bgColor: 'bg-purple-100',
                textColor: 'text-purple-600',
                time: '1 hour ago',
                amount: ''
            },
            {
                title: 'Invoice #INV-002 marked as overdue',
                icon: 'fas fa-exclamation-triangle',
                bgColor: 'bg-red-100',
                textColor: 'text-red-600',
                time: '2 hours ago',
                amount: '$1,980.00'
            }
        ];
    }

    updateNotifications() {
        const notificationsEl = document.getElementById('notifications-list');
        if (!notificationsEl) return;
        
        const notifications = this.generateNotifications();
        
        notificationsEl.innerHTML = notifications.map(notification => `
            <div class="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                <div class="flex items-start">
                    <div class="w-2 h-2 rounded-full ${notification.unread ? 'bg-blue-500' : 'bg-gray-300'} mt-2 mr-3"></div>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                        <p class="text-xs text-gray-500 mt-1">${notification.message}</p>
                        <p class="text-xs text-gray-400 mt-1">${notification.time}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    generateNotifications() {
        return [
            {
                title: 'Payment Reminder Sent',
                message: 'Automatic reminder sent to Tech Solutions for invoice #INV-002',
                time: '30 minutes ago',
                unread: true
            },
            {
                title: 'Subscription Renewal',
                message: 'Your Starter plan will renew in 5 days',
                time: '2 hours ago',
                unread: true
            },
            {
                title: 'New Feature Available',
                message: 'Advanced reporting features are now available in your plan',
                time: '1 day ago',
                unread: false
            }
        ];
    }

    startAutoRefresh() {
        this.log('🔄 Starting auto-refresh');
        this.refreshInterval = setInterval(() => {
            this.refreshDashboard();
        }, this.updateFrequency);
    }

    stopAutoRefresh() {
        this.log('⏹️ Stopping auto-refresh');
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    refreshDashboard() {
        this.log('🔄 Refreshing dashboard data');
        this.loadDashboardData();
        this.updateCharts();
    }

    updateCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    switchChartType(chartType) {
        this.log('📈 Switching chart type', { chartType });
        // Implementation for switching chart types
        // This would update the revenue chart to show different visualizations
    }

    updateChartsForPeriod(period) {
        this.log('📅 Updating charts for period', { period });
        // Implementation for updating charts based on selected time period
        // This would filter and update all chart data
    }

    initializeAnimations() {
        // Animate dashboard elements on load
        anime({
            targets: '.stat-card',
            translateY: [20, 0],
            opacity: [0, 1],
            delay: anime.stagger(100),
            duration: 600,
            easing: 'easeOutQuad'
        });

        anime({
            targets: '.chart-container',
            scale: [0.95, 1],
            opacity: [0, 1],
            delay: anime.stagger(200, {start: 300}),
            duration: 800,
            easing: 'easeOutQuad'
        });

        anime({
            targets: '.activity-item',
            translateX: [-20, 0],
            opacity: [0, 1],
            delay: anime.stagger(50, {start: 600}),
            duration: 500,
            easing: 'easeOutQuad'
        });
    }

    // Cleanup method
    destroy() {
        this.stopAutoRefresh();
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.dispose === 'function') {
                chart.dispose();
            }
        });
        this.charts = {};
    }
}

// Initialize enhanced dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for auth service and other dependencies
    setTimeout(() => {
        window.enhancedDashboard = new EnhancedDashboard();
    }, 100);
});

// Handle window resize for charts
window.addEventListener('resize', function() {
    if (window.enhancedDashboard) {
        window.enhancedDashboard.updateCharts();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.enhancedDashboard) {
        window.enhancedDashboard.destroy();
    }
});
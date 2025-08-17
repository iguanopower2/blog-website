document.addEventListener('DOMContentLoaded', function () {
    // --- Elementos del DOM ---
    const investmentForm = document.getElementById('investment-form');
    const mortgageForm = document.getElementById('mortgage-form');
    const investmentOptions = document.getElementById('investment-options');
    const interestRateInput = document.getElementById('interest-rate');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    let investmentChartInstance = null;
    let amortizationData = []; // Guardar datos para exportar

    // --- Lógica para formatear campos de dinero ---
    const moneyInputs = [
        document.getElementById('initial-investment'),
        document.getElementById('monthly-contribution'),
        document.getElementById('loan-amount'),
        document.getElementById('extra-payment')
    ];

    moneyInputs.forEach(input => {
        formatInputAsCurrency(input);
        input.addEventListener('input', (e) => formatInputAsCurrency(e.target));
    });

    function formatInputAsCurrency(element) {
        let cursorPosition = element.selectionStart;
        let originalLength = element.value.length;
        let originalCommas = (element.value.match(/,/g) || []).length;

        let value = element.value;
        let numberValue = value.replace(/[^0-9]/g, '');
        if (numberValue === '') {
            element.value = '';
            return;
        }
        let formattedValue = parseInt(numberValue, 10).toLocaleString('es-MX');
        element.value = formattedValue;

        let newLength = formattedValue.length;
        let newCommas = (formattedValue.match(/,/g) || []).length;
        let commaDifference = newCommas - originalCommas;

        if (newLength > originalLength) {
            element.selectionEnd = cursorPosition + commaDifference;
        } else {
            element.selectionEnd = cursorPosition - (originalCommas - newCommas);
        }
    }

    function getNumericValue(elementId) {
        const element = document.getElementById(elementId);
        const rawValue = element.value.replace(/,/g, '');
        return parseFloat(rawValue) || 0;
    }
    
    // --- Lógica de la Calculadora de Inversión ---
    fetch('data/inversiones.json')
        .then(response => response.json())
        .then(data => {
            investmentOptions.innerHTML = '<option value="">-- Elige una opción --</option>';
            data.forEach(item => {
                const rate = item.plazos['12 meses'] || item.plazos['Vista'] || 0;
                if (rate > 0) {
                    const option = document.createElement('option');
                    option.value = rate;
                    option.textContent = item.nombre;
                    investmentOptions.appendChild(option);
                }
            });
        });

    investmentOptions.addEventListener('change', function() {
        if (this.value) {
            interestRateInput.value = this.value;
        }
    });

    investmentForm.addEventListener('submit', function (e) {
        e.preventDefault();
        calculateInvestment();
    });

    function calculateInvestment() {
        const initial = getNumericValue('initial-investment');
        const monthly = getNumericValue('monthly-contribution');
        const years = parseInt(document.getElementById('investment-period').value) || 0;
        const rate = parseFloat(interestRateInput.value) / 100 || 0;
        const reinvest = document.getElementById('reinvest').checked;

        const monthlyRate = rate / 12;
        const months = years * 12;
        let total = initial;
        let totalContributed = initial;
        let accumulatedInterest = 0;
        const chartData = { labels: [], principalData: [], gainData: [] };

        for (let i = 1; i <= months; i++) {
            let interestThisMonth = total * monthlyRate;
            if (reinvest) {
                total += interestThisMonth;
            } else {
                accumulatedInterest += interestThisMonth;
            }
            if (monthly > 0) {
              total += monthly;
              totalContributed += monthly;
            }
            if (i % 12 === 0 || i === months) {
                chartData.labels.push(`Año ${Math.ceil(i/12)}`);
                chartData.principalData.push(totalContributed.toFixed(2));
                let currentGain = (total + accumulatedInterest) - totalContributed;
                chartData.gainData.push(currentGain.toFixed(2));
            }
        }
        
        const finalAmount = total + accumulatedInterest;
        const totalGain = finalAmount - totalContributed;

        document.getElementById('final-amount').textContent = formatCurrency(finalAmount);
        document.getElementById('total-contributed').textContent = formatCurrency(totalContributed);
        document.getElementById('total-gain').textContent = formatCurrency(totalGain);

        drawInvestmentChart(chartData);
    }

    // --- Lógica de la Calculadora de Crédito Hipotecario ---
    mortgageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateMortgage();
    });

    function calculateMortgage() {
        const loanAmount = getNumericValue('loan-amount');
        const extraPayment = getNumericValue('extra-payment');
        const annualRate = parseFloat(document.getElementById('mortgage-rate').value) / 100 || 0;
        const years = parseInt(document.getElementById('loan-term').value) || 0;
        
        if (loanAmount <= 0 || annualRate <= 0 || years <= 0) return;

        const monthlyRate = annualRate / 12;
        const numberOfPayments = years * 12;
        const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        const totalPaidNoExtra = monthlyPayment * numberOfPayments;
        const totalInterestNoExtra = totalPaidNoExtra - loanAmount;
        
        document.getElementById('monthly-payment').textContent = formatCurrency(monthlyPayment);
        document.getElementById('total-paid-no-extra').textContent = formatCurrency(totalPaidNoExtra);
        document.getElementById('total-interest-paid').textContent = formatCurrency(totalInterestNoExtra);

        let remainingBalance = loanAmount;
        let monthsWithExtra = 0;
        let totalInterestWithExtra = 0;
        amortizationData = []; // Limpiar datos anteriores
        
        while (remainingBalance > 0 && monthsWithExtra < numberOfPayments * 2) {
            monthsWithExtra++;
            let interestComponent = remainingBalance * monthlyRate;
            let principalComponent = monthlyPayment - interestComponent;
            let totalMonthlyPayment = monthlyPayment;

            if (extraPayment > 0) {
                let actualExtraPayment = Math.min(extraPayment, remainingBalance - principalComponent);
                principalComponent += actualExtraPayment;
                totalMonthlyPayment += actualExtraPayment;
            }
            
            remainingBalance -= principalComponent;
            totalInterestWithExtra += interestComponent;
            
            amortizationData.push({
                month: monthsWithExtra,
                payment: totalMonthlyPayment,
                interest: interestComponent,
                principal: principalComponent,
                balance: remainingBalance > 0 ? remainingBalance : 0
            });

            if (remainingBalance <= 0) break;
        }

        generateAmortizationTable(amortizationData);

        if (extraPayment > 0) {
            const yearsWithExtra = Math.floor(monthsWithExtra / 12);
            const remainingMonths = monthsWithExtra % 12;
            document.getElementById('new-loan-term').textContent = `${yearsWithExtra} años y ${remainingMonths} meses`;
            const interestSaved = totalInterestNoExtra - totalInterestWithExtra;
            document.getElementById('interest-saved').textContent = formatCurrency(interestSaved);
            document.getElementById('total-interest-paid').textContent = formatCurrency(totalInterestWithExtra);
        } else {
             document.getElementById('new-loan-term').textContent = `${years} años`;
             document.getElementById('interest-saved').textContent = formatCurrency(0);
        }
    }

    function generateAmortizationTable(data) {
        const tableBody = document.querySelector("#amortization-table tbody");
        tableBody.innerHTML = ""; // Limpiar tabla
        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.month}</td>
                <td>${formatCurrency(row.payment)}</td>
                <td>${formatCurrency(row.interest)}</td>
                <td>${formatCurrency(row.principal)}</td>
                <td>${formatCurrency(row.balance)}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    exportCsvBtn.addEventListener('click', function() {
        let csvContent = "data:text/csv;charset=utf-8,Mes,Pago,Interes,Capital,Saldo Restante\n";
        amortizationData.forEach(row => {
            let csvRow = [row.month, row.payment.toFixed(2), row.interest.toFixed(2), row.principal.toFixed(2), row.balance.toFixed(2)].join(",");
            csvContent += csvRow + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "tabla_amortizacion.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- Funciones de Utilidad y Gráfica ---
    function drawInvestmentChart(chartData) {
        const ctx = document.getElementById('investment-chart').getContext('2d');
        if (investmentChartInstance) {
            investmentChartInstance.destroy();
        }
        investmentChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Total Aportado',
                    data: chartData.principalData,
                    backgroundColor: '#303f9f',
                }, {
                    label: 'Ganancia',
                    data: chartData.gainData,
                    backgroundColor: '#2e7d32',
                }]
            },
            options: {
                responsive: true,
                scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: value => formatCurrency(value) } } },
                plugins: { tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` } } }
            }
        });
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    }

    // Disparar un cálculo inicial
    calculateInvestment();
    calculateMortgage();
});

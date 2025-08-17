document.addEventListener('DOMContentLoaded', function () {
    // --- Almacén de datos ---
    let investmentsData = [];

    // --- Elementos del DOM ---
    const investmentForm = document.getElementById('investment-form');
    const mortgageForm = document.getElementById('mortgage-form');
    const yieldForm = document.getElementById('yield-form');
    const yieldOptions = document.getElementById('yield-investment-options');
    const yieldAmountInput = document.getElementById('yield-amount');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    let investmentChartInstance = null;
    let amortizationData = [];

    // --- Lógica de Formateo de Moneda (Compartida) ---
    const moneyInputs = document.querySelectorAll('input[inputmode="numeric"]');
    moneyInputs.forEach(input => {
        formatInputAsCurrency(input);
        input.addEventListener('input', (e) => formatInputAsCurrency(e.target));
    });

    function formatInputAsCurrency(element) {
        let cursorPosition = element.selectionStart;
        let originalLength = element.value.length;
        let value = element.value.replace(/[^0-9]/g, '');
        
        if (value === '') {
            element.value = '';
            return;
        }
        
        let formattedValue = parseInt(value, 10).toLocaleString('es-MX');
        let newLength = formattedValue.length;
        
        element.value = formattedValue;
        
        let newCursorPosition = cursorPosition + (newLength - originalLength);
        element.setSelectionRange(newCursorPosition, newCursorPosition);
    }

    function getNumericValue(elementId) {
        const rawValue = document.getElementById(elementId).value.replace(/,/g, '');
        return parseFloat(rawValue) || 0;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    }

    // --- NUEVA: Lógica de la Calculadora de Rendimientos por Plazo ---
    
    // Cargar datos y poblar el dropdown
    fetch('data/inversiones.json')
        .then(response => response.json())
        .then(data => {
            investmentsData = data;
            yieldOptions.innerHTML = '<option value="">-- Elige una opción --</option>';
            investmentsData.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = index; // Usar el índice como valor
                option.textContent = item.nombre.replace(/<sup>.*<\/sup>/, ''); // Limpiar HTML del nombre
                yieldOptions.appendChild(option);
            });
        });

    // Event listeners para calcular automáticamente
    yieldOptions.addEventListener('change', calculateYields);
    yieldAmountInput.addEventListener('input', calculateYields);

    function calculateYields() {
        const selectedIndex = yieldOptions.value;
        const amount = getNumericValue('yield-amount');
        const resultsContainer = document.getElementById('yield-results-container');
        const resultsTable = document.getElementById('yield-results-table');

        if (selectedIndex === "" || amount <= 0) {
            resultsContainer.style.display = 'none';
            return;
        }

        const selectedInvestment = investmentsData[selectedIndex];
        resultsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Plazo</th>
                    <th>Tasa Anual</th>
                    <th>Ganancia Bruta</th>
                </tr>
            </thead>
            <tbody></tbody>`;
        const tableBody = resultsTable.querySelector('tbody');
        
        let hasResults = false;
        // Mapeo de plazos a días para un cálculo más preciso
        const plazoEnDias = {
            'Vista': 1, '1 mes': 30, '3 meses': 90, '6 meses': 180, '12 meses': 365
        };

        for (const plazo in selectedInvestment.plazos) {
            const rate = selectedInvestment.plazos[plazo];
            if (rate !== null && rate > 0) {
                hasResults = true;
                const days = plazoEnDias[plazo] || 30; // Fallback a 30 días
                const annualRate = rate / 100;
                const dailyRate = annualRate / 365;
                const earnings = amount * dailyRate * days;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${plazo}</td>
                    <td>${rate}%</td>
                    <td><strong>${formatCurrency(earnings)}</strong></td>
                `;
                tableBody.appendChild(row);
            }
        }
        
        resultsContainer.style.display = hasResults ? 'block' : 'none';
    }

    // --- Lógica de la Calculadora de Interés Compuesto ---
    investmentForm.addEventListener('submit', function (e) {
        e.preventDefault();
        calculateInvestment();
    });

    function calculateInvestment() {
        const initial = getNumericValue('initial-investment');
        const monthly = getNumericValue('monthly-contribution');
        const years = parseInt(document.getElementById('investment-period').value) || 0;
        const rate = parseFloat(document.getElementById('interest-rate').value) / 100 || 0;
        const reinvest = document.getElementById('reinvest').checked;

        const monthlyRate = rate / 12;
        const months = years * 12;
        let total = initial;
        let totalContributed = initial;
        let accumulatedInterest = 0;
        const chartData = { labels: [], principalData: [], gainData: [] };

        for (let i = 1; i <= months; i++) {
            let interestThisMonth = total * monthlyRate;
            if (reinvest) { total += interestThisMonth; } 
            else { accumulatedInterest += interestThisMonth; }
            if (monthly > 0) { total += monthly; totalContributed += monthly; }
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
    mortgageForm.addEventListener('submit', function(e) { e.preventDefault(); calculateMortgage(); });
    exportCsvBtn.addEventListener('click', exportAmortizationToCsv);

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

        let remainingBalance = loanAmount, monthsWithExtra = 0, totalInterestWithExtra = 0;
        amortizationData = [];
        
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
                month: monthsWithExtra, payment: totalMonthlyPayment, interest: interestComponent,
                principal: principalComponent, balance: remainingBalance > 0 ? remainingBalance : 0
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
        tableBody.innerHTML = "";
        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.month}</td> <td>${formatCurrency(row.payment)}</td>
                <td>${formatCurrency(row.interest)}</td> <td>${formatCurrency(row.principal)}</td>
                <td>${formatCurrency(row.balance)}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function exportAmortizationToCsv() {
        let csvContent = "data:text/csv;charset=utf-8,Mes,Pago,Interes,Capital,Saldo Restante\n";
        amortizationData.forEach(row => {
            let csvRow = [row.month, row.payment.toFixed(2), row.interest.toFixed(2), row.principal.toFixed(2), row.balance.toFixed(2)].join(",");
            csvContent += csvRow + "\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "tabla_amortizacion.csv");
        link.click();
    }

    function drawInvestmentChart(chartData) {
        const ctx = document.getElementById('investment-chart').getContext('2d');
        if (investmentChartInstance) { investmentChartInstance.destroy(); }
        investmentChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Total Aportado', data: chartData.principalData, backgroundColor: '#303f9f',
                }, {
                    label: 'Ganancia', data: chartData.gainData, backgroundColor: '#2e7d32',
                }]
            },
            options: {
                responsive: true,
                scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: value => formatCurrency(value) } } },
                plugins: { tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` } } }
            }
        });
    }

    // Disparar un cálculo inicial para las calculadoras
    calculateInvestment();
    calculateMortgage();
});

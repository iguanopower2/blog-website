document.addEventListener('DOMContentLoaded', function () {
    // --- Elementos del DOM ---
    const investmentForm = document.getElementById('investment-form');
    const mortgageForm = document.getElementById('mortgage-form');
    const investmentOptions = document.getElementById('investment-options');
    const interestRateInput = document.getElementById('interest-rate');
    let investmentChartInstance = null;

    // --- NUEVO: Lógica para formatear campos de dinero ---
    const moneyInputs = [
        document.getElementById('initial-investment'),
        document.getElementById('monthly-contribution'),
        document.getElementById('loan-amount'),
        document.getElementById('extra-payment')
    ];

    moneyInputs.forEach(input => {
        // Formatear el valor inicial al cargar la página
        formatInputAsCurrency(input);
        // Formatear mientras el usuario escribe
        input.addEventListener('input', () => formatInputAsCurrency(input));
    });

    function formatInputAsCurrency(element) {
        let value = element.value;
        // 1. Quitar cualquier caracter que no sea un número
        let numberValue = value.replace(/[^0-9]/g, '');
        if (numberValue === '') {
            element.value = '';
            return;
        }
        // 2. Formatear el número con comas
        let formattedValue = parseInt(numberValue, 10).toLocaleString('es-MX');
        // 3. Poner el valor formateado de nuevo en el campo
        element.value = formattedValue;
    }

    function getNumericValue(elementId) {
        const element = document.getElementById(elementId);
        // Quitar las comas para poder hacer cálculos
        const rawValue = element.value.replace(/,/g, '');
        return parseFloat(rawValue) || 0;
    }
    
    // --- Lógica de la Calculadora de Inversión (actualizada) ---
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
        // CAMBIO: Usar la nueva función para obtener valores numéricos
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

    // --- Lógica de la Calculadora de Crédito Hipotecario (actualizada) ---
    mortgageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateMortgage();
    });

    function calculateMortgage() {
        // CAMBIO: Usar la nueva función para obtener valores numéricos
        const loanAmount = getNumericValue('loan-amount');
        const extraPayment = getNumericValue('extra-payment');
        const annualRate = parseFloat(document.getElementById('mortgage-rate').value) / 100 || 0;
        const years = parseInt(document.getElementById('loan-term').value) || 0;
        
        if (loanAmount <= 0 || annualRate <= 0 || years <= 0) return;

        const monthlyRate = annualRate / 12;
        const numberOfPayments = years * 12;
        const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        const totalPaidNoExtra = monthlyPayment * numberOfPayments;
        
        document.getElementById('monthly-payment').textContent = formatCurrency(monthlyPayment);
        document.getElementById('total-paid-no-extra').textContent = formatCurrency(totalPaidNoExtra);

        if (extraPayment > 0) {
            let remainingBalance = loanAmount;
            let monthsWithExtra = 0;
            let totalInterestWithExtra = 0;
            
            while (remainingBalance > 0 && monthsWithExtra < numberOfPayments * 2) {
                let interestComponent = remainingBalance * monthlyRate;
                let principalComponent = (monthlyPayment + extraPayment) - interestComponent;
                remainingBalance -= principalComponent;
                totalInterestWithExtra += interestComponent;
                monthsWithExtra++;
            }

            const yearsWithExtra = Math.floor(monthsWithExtra / 12);
            const remainingMonths = monthsWithExtra % 12;
            document.getElementById('new-loan-term').textContent = `${yearsWithExtra} años y ${remainingMonths} meses`;
            const interestSaved = (totalPaidNoExtra - loanAmount) - totalInterestWithExtra;
            document.getElementById('interest-saved').textContent = formatCurrency(interestSaved);
        } else {
             document.getElementById('new-loan-term').textContent = `${years} años`;
             document.getElementById('interest-saved').textContent = formatCurrency(0);
        }
    }

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

    // Disparar un cálculo inicial para que la página no se vea vacía
    calculateInvestment();
    calculateMortgage();
});

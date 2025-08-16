document.addEventListener('DOMContentLoaded', function () {
    // --- Elementos del DOM ---
    const investmentForm = document.getElementById('investment-form');
    const mortgageForm = document.getElementById('mortgage-form');
    const investmentOptions = document.getElementById('investment-options');
    const interestRateInput = document.getElementById('interest-rate');
    let investmentChartInstance = null;

    // --- Lógica de la Calculadora de Inversión ---

    // Cargar opciones de inversión desde el JSON
    fetch('data/inversiones.json')
        .then(response => response.json())
        .then(data => {
            investmentOptions.innerHTML = '<option value="">-- Elige una opción --</option>';
            data.forEach(item => {
                // Usamos el plazo a 12 meses como tasa de referencia, o a la vista si no existe
                const rate = item.plazos['12 meses'] || item.plazos['Vista'] || 0;
                if (rate > 0) {
                    const option = document.createElement('option');
                    option.value = rate;
                    option.textContent = item.nombre;
                    investmentOptions.appendChild(option);
                }
            });
        });

    // Actualizar la tasa de interés cuando se elige una opción
    investmentOptions.addEventListener('change', function() {
        if (this.value) {
            interestRateInput.value = this.value;
        }
    });

    // Evento para calcular la inversión
    investmentForm.addEventListener('submit', function (e) {
        e.preventDefault();
        calculateInvestment();
    });

    function calculateInvestment() {
        const initial = parseFloat(document.getElementById('initial-investment').value) || 0;
        const monthly = parseFloat(document.getElementById('monthly-contribution').value) || 0;
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
        const loanAmount = parseFloat(document.getElementById('loan-amount').value) || 0;
        const annualRate = parseFloat(document.getElementById('mortgage-rate').value) / 100 || 0;
        const years = parseInt(document.getElementById('loan-term').value) || 0;
        const extraPayment = parseFloat(document.getElementById('extra-payment').value) || 0;
        
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
            
            while (remainingBalance > 0 && monthsWithExtra < numberOfPayments * 2) { // Safety break
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

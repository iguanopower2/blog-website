/**
 * ARCHIVO: calculadoras.js
 * VERSIÓN CORREGIDA (v8 - Las 3 calculadoras completas)
 */

const calculadoras = {

    investmentChartInstance: null,

    // ========================================================
    // 1. Lógica de Interés Compuesto
    // ========================================================
    initInteresCompuesto: function() {
        const form = document.getElementById("form-interes-compuesto");
        if (!form) {
            console.log("INFO: Calculadora de Interés Compuesto no encontrada.");
            return;
        }

        console.log("✅ Calculadora de Interés Compuesto INICIALIZADA.");

        const montoInicialInput = document.getElementById("monto-inicial");
        const aportacionMensualInput = document.getElementById("aportacion-mensual");
        const tasaInteresInput = document.getElementById("tasa-interes-anual");
        const periodoInput = document.getElementById("periodo-anios");
        const freqInput = document.getElementById("compounding-frequency");
        const resultadoDiv = document.getElementById("resultado-interes-compuesto");

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const P = this.getNumericValue("monto-inicial");
            const PMT = this.getNumericValue("aportacion-mensual");
            const r = parseFloat(tasaInteresInput.value) / 100;
            const t = parseInt(periodoInput.value);

            const freqValue = freqInput.value;
            const freqMap = { "diario": 365, "mensual": 12, "trimestral": 4, "semestral": 2, "anual": 1 };
            const n = freqMap[freqValue] || 12;
            const f = 12;

            const numTotalPeriodos = n * t;
            const tasaPeriodica = r / n;
            const numTotalAportaciones = f * t;

            let montoFinalCompuesto;

            if (tasaPeriodica > 0) {
                const futuroCapitalInicial = P * Math.pow(1 + tasaPeriodica, numTotalPeriodos);
                const futuroAportaciones = PMT * ( (Math.pow(1 + tasaPeriodica, numTotalPeriodos) - 1) / (Math.pow(1 + tasaPeriodica, n / f) - 1) );
                montoFinalCompuesto = futuroCapitalInicial + futuroAportaciones;
            } else {
                montoFinalCompuesto = P + (PMT * numTotalAportaciones);
            }

            const totalAportado = P + (PMT * numTotalAportaciones);
            const gananciaTotal = montoFinalCompuesto - totalAportado;

            // --- Lógica de la Gráfica ---
            let labels = ["Año 0"];
            let compoundData = [P];
            let simpleData = [P];
            let aportadoData = [P];

            for (let anio = 1; anio <= t; anio++) {
                let T_actual = anio;
                let N_actual = n * T_actual;
                let F_actual = f * T_actual;

                if (tasaPeriodica > 0) {
                    let fv_P = P * Math.pow(1 + tasaPeriodica, N_actual);
                    let fv_PMT = PMT * ( (Math.pow(1 + tasaPeriodica, N_actual) - 1) / (Math.pow(1 + tasaPeriodica, n / f) - 1) );
                    compoundData.push(fv_P + fv_PMT);
                } else {
                    compoundData.push(P + (PMT * F_actual));
                }

                let interesSimple = P * (r * T_actual);
                let totalAportadoSimple = PMT * F_actual;
                simpleData.push(P + interesSimple + totalAportadoSimple);
                aportadoData.push(P + totalAportadoSimple);
                labels.push(`Año ${anio}`);
            }

            this.renderInvestmentChart(labels, compoundData, simpleData, aportadoData);

            // --- Mostrar Resultados en Texto ---
            resultadoDiv.innerHTML = `
                <h3>Resultado de tu Proyección</h3>
                <div class="result-item">
                    <span>Monto Final (Compuesto):</span>
                    <strong class="text-success">${this.formatCurrency(montoFinalCompuesto)}</strong>
                </div>
                <div class="result-item">
                    <span>Total Aportado:</span>
                    <span>${this.formatCurrency(totalAportado)}</span>
                </div>
                <div class="result-item">
                    <span>Ganancia (Interés):</span>
                    <strong class="text-success">${this.formatCurrency(gananciaTotal)}</strong>
                </div>
                <p class="nota">Calculado a ${t} años con una tasa de ${tasaInteresInput.value}% anual (capitalizable de forma ${freqValue}).</p>
            `;
            resultadoDiv.style.display = 'block';
        });

        setTimeout(() => {
            if (montoInicialInput.value) {
                form.dispatchEvent(new Event('submit'));
            }
        }, 500);
    },

    // ========================================================
    // 2. Lógica de Crédito Hipotecario
    // ========================================================
    initCreditoHipotecario: function() {
        const mortgageForm = document.getElementById('mortgage-form');
        if (!mortgageForm) {
            console.log("INFO: Calculadora de Crédito Hipotecario no encontrada.");
            return;
        }

        console.log("✅ Calculadora de Crédito Hipotecario INICIALIZADA.");

        const exportCsvBtn = document.getElementById('export-csv-btn');
        let amortizationData = [];

        mortgageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            amortizationData = this.calculateMortgage();
        });

        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportAmortizationToCsv(amortizationData));
        }
    },

    // ========================================================
    // 3. Lógica de Plazo Fijo (¡NUEVA!)
    // ========================================================
    initPlazoFijo: function() {
        const form = document.getElementById("form-plazo-fijo");
        if (!form) {
            console.log("INFO: Calculadora de Plazo Fijo no encontrada.");
            return;
        }

        console.log("✅ Calculadora de Plazo Fijo INICIALIZADA.");

        const montoInput = document.getElementById("monto-plazo-fijo");
        const tasaInput = document.getElementById("tasa-plazo-fijo");
        const plazoInput = document.getElementById("plazo-dias");
        const isrInput = document.getElementById("tasa-isr");
        const resultadoDiv = document.getElementById("resultado-plazo-fijo");

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            // 1. Obtener y parsear valores
            const monto = this.getNumericValue("monto-plazo-fijo");
            const tasaAnual = parseFloat(tasaInput.value) / 100;
            const plazoDias = parseInt(plazoInput.value);
            const tasaISR = parseFloat(isrInput.value) / 100;

            // 2. Calcular
            const gananciaBruta = monto * (tasaAnual / 360) * plazoDias;
            // La retención de ISR es sobre el capital, no sobre la ganancia
            const retencionISR = monto * (tasaISR / 360) * plazoDias;
            const gananciaNeta = gananciaBruta - retencionISR;

            // 3. Mostrar resultados
            resultadoDiv.innerHTML = `
                <h3>Resultado de tu Inversión</h3>
                <div class="result-item">
                    <span>Ganancia Bruta (Rendimiento):</span>
                    <strong class="text-success">${this.formatCurrency(gananciaBruta)}</strong>
                </div>
                <div class="result-item">
                    <span>Retención ISR (${isrInput.value}%):</span>
                    <span class="text-danger">- ${this.formatCurrency(retencionISR)}</span>
                </div>
                <div class="result-item total">
                    <span>Ganancia Neta (Aprox.):</span>
                    <strong class="text-success">${this.formatCurrency(gananciaNeta)}</strong>
                </div>
                <div class="result-item total">
                    <span>Monto Total al Vencer:</span>
                    <strong>${this.formatCurrency(monto + gananciaNeta)}</strong>
                </div>
                <p class="nota">Simulación para un plazo de ${plazoDias} días, usando 360 días por año para el cálculo.</p>
            `;
            resultadoDiv.style.display = 'block';
        });

        // Calcular al inicio
        setTimeout(() => {
            if (montoInput.value) {
                form.dispatchEvent(new Event('submit'));
            }
        }, 500);
    },

    // ========================================================
    // 🛠️ HELPERS (Funciones de apoyo)
    // ========================================================

    // Helper de Cálculo de Hipoteca
    // Helper de Cálculo de Hipoteca (CORREGIDO)
    calculateMortgage: function() {
        const loanAmount = this.getNumericValue('loan-amount');
        const extraPayment = this.getNumericValue('extra-payment');
        const annualRate = parseFloat(document.getElementById('mortgage-rate').value) / 100 || 0;
        const years = parseInt(document.getElementById('loan-term').value) || 0;

        if (loanAmount <= 0 || annualRate <= 0 || years <= 0) {
            // Resetear valores si faltan datos
            this.updateElement('monthly-payment', 0);
            this.updateElement('total-interest-paid', 0);
            this.updateElement('total-paid-no-extra', 0);
            this.updateElement('new-loan-term', '-- años', false);
            this.updateElement('interest-saved', 0);
            this.generateAmortizationTable([]);
            return [];
        }

        const monthlyRate = annualRate / 12;
        const numberOfPayments = years * 12;
        
        // Cálculo del pago mensual estándar
        const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        
        // Totales originales (SIN abonos extra)
        const totalPaidNoExtra = monthlyPayment * numberOfPayments;
        const totalInterestNoExtra = totalPaidNoExtra - loanAmount;

        // Actualizamos UI inicial (por defecto asume sin extras)
        this.updateElement('monthly-payment', monthlyPayment);
        this.updateElement('total-paid-no-extra', totalPaidNoExtra);
        this.updateElement('total-interest-paid', totalInterestNoExtra);

        // --- Lógica de Amortización con Abonos Extra ---
        let remainingBalance = loanAmount, monthsWithExtra = 0, totalInterestWithExtra = 0;
        let localAmortizationData = [];

        while (remainingBalance > 0.005 && monthsWithExtra < numberOfPayments * 2) {
            monthsWithExtra++;
            let interestComponent = remainingBalance * monthlyRate;
            let principalComponent = monthlyPayment - interestComponent;
            let totalMonthlyPayment = monthlyPayment;

            // Aplicar abono extra si existe
            if (extraPayment > 0) {
                let actualExtraPayment = Math.min(extraPayment, remainingBalance - principalComponent);
                principalComponent += actualExtraPayment;
                totalMonthlyPayment += actualExtraPayment;
            }
            
            // Ajustes finales si el pago supera el saldo
            if (principalComponent > remainingBalance) {
                principalComponent = remainingBalance;
                totalMonthlyPayment = interestComponent + principalComponent;
            }
            if (remainingBalance + interestComponent < monthlyPayment) {
                principalComponent = remainingBalance;
                totalMonthlyPayment = remainingBalance + interestComponent;
            }

            remainingBalance -= principalComponent;
            totalInterestWithExtra += interestComponent;

            localAmortizationData.push({
                month: monthsWithExtra,
                payment: totalMonthlyPayment,
                interest: interestComponent,
                principal: principalComponent,
                balance: Math.max(remainingBalance, 0)
            });

            if (remainingBalance <= 0.005) break;
        }

        this.generateAmortizationTable(localAmortizationData);

        // --- ACTUALIZACIÓN DE RESULTADOS ---
        if (extraPayment > 0) {
            const yearsWithExtra = Math.floor(monthsWithExtra / 12);
            const remainingMonths = monthsWithExtra % 12;
            const interestSaved = totalInterestNoExtra - totalInterestWithExtra;
            
            // Calcular el NUEVO total pagado (Préstamo + Intereses reales pagados)
            const totalPaidWithExtra = loanAmount + totalInterestWithExtra; 

            this.updateElement('new-loan-term', `${yearsWithExtra} años y ${remainingMonths} meses`, false);
            this.updateElement('interest-saved', interestSaved);
            this.updateElement('total-interest-paid', totalInterestWithExtra);
            
            // 👇 AQUÍ ESTABA EL ERROR: Faltaba actualizar esta línea
            this.updateElement('total-paid-no-extra', totalPaidWithExtra); 
            
        } else {
            // Si no hay pagos extra, nos aseguramos de mostrar los valores originales
            this.updateElement('new-loan-term', `${years} años`, false);
            this.updateElement('interest-saved', 0);
            this.updateElement('total-interest-paid', totalInterestNoExtra);
            this.updateElement('total-paid-no-extra', totalPaidNoExtra);
        }
        return localAmortizationData;
    },

    // Helper de Formato de Moneda (con fix de "0")
    formatInputAsCurrency: function(element, isTyping = true) {
        let cursorPosition = element.selectionStart;
        let originalLength = element.value.length;
        let value = element.value.replace(/[^0-9]/g, '');

        if (value === '') {
            element.value = '';
            return;
        }

        if (value === '0' && isTyping) {
            element.value = '0';
            element.setSelectionRange(1, 1);
            return;
        }

        let formattedValue = parseInt(value, 10).toLocaleString('es-MX');
        element.value = formattedValue;

        if (isTyping) {
            let newLength = formattedValue.length;
            let lengthDifference = newLength - originalLength;
            let newCursorPosition = cursorPosition + lengthDifference;
            newCursorPosition = Math.max(0, Math.min(newCursorPosition, newLength));
            element.setSelectionRange(newCursorPosition, newCursorPosition);
        }
    },

    // Helper para obtener valor numérico
    getNumericValue: function(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return 0;
        const rawValue = element.value.replace(/,/g, '');
        return parseFloat(rawValue) || 0;
    },

    // Helper para formatear a moneda (ej. $1,234.56)
    formatCurrency: function(value) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    },

    // Helper para actualizar texto de un elemento
    updateElement: function(elementId, value, isCurrency = true) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = isCurrency ? this.formatCurrency(value) : value;
        }
    },

    // Helper para generar tabla de amortización
    generateAmortizationTable: function(data) {
        const tableBody = document.querySelector("#amortization-table tbody");
        if (!tableBody) return;
        tableBody.innerHTML = "";
        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.month}</td>
                <td>${this.formatCurrency(row.payment)}</td>
                <td>${this.formatCurrency(row.interest)}</td>
                <td>${this.formatCurrency(row.principal)}</td>
                <td>${this.formatCurrency(row.balance)}</td>
            `;
            tableBody.appendChild(tr);
        });
    },

    // Helper para exportar CSV
    exportAmortizationToCsv: function(data) {
        if (data.length === 0) {
            alert("Primero calcula la amortización antes de exportar.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Mes,Pago,Interes,Capital,Saldo Restante\n";
        data.forEach(row => {
            let csvRow = [row.month, row.payment.toFixed(2), row.interest.toFixed(2), row.principal.toFixed(2), row.balance.toFixed(2)].join(",");
            csvContent += csvRow + "\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "tabla_amortizacion.csv");
        link.click();
    },

    // Helper de Gráfica
    renderInvestmentChart: function(labels, compoundData, simpleData, aportadoData) {
        const ctx = document.getElementById('investment-chart');
        if (!ctx) return;

        if (this.investmentChartInstance) {
            this.investmentChartInstance.destroy();
        }

        document.querySelector('.chart-container').style.display = 'block';

        this.investmentChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Interés Compuesto',
                        data: compoundData,
                        borderColor: '#2e7d32',
                        backgroundColor: 'rgba(46, 125, 50, 0.1)',
                        borderWidth: 3,
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Interés Simple',
                        data: simpleData,
                        borderColor: '#b71c1c',
                        backgroundColor: 'rgba(183, 28, 28, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Total Aportado',
                        data: aportadoData,
                        borderColor: '#555',
                        backgroundColor: 'rgba(85, 85, 85, 0.1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Crecimiento de la Inversión (Compuesto vs. Simple)'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value, index, ticks) {
                                return new Intl.NumberFormat('es-MX', {
                                    style: 'currency',
                                    currency: 'MXN',
                                    maximumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });
    },

    // ========================================================
    // 🚀 INICIALIZADOR PRINCIPAL
    // ========================================================
    init: function() {
        console.log("🚀 Inicializando todas las calculadoras...");

        const moneyInputs = document.querySelectorAll('input[inputmode="numeric"]');
        if (moneyInputs.length > 0) {
            moneyInputs.forEach(input => {
                this.formatInputAsCurrency(input, false);
                input.addEventListener('input', (e) => {
                    this.formatInputAsCurrency(e.target, true);
                });
                input.addEventListener('blur', (e) => {
                     this.formatInputAsCurrency(e.target, false);
                });
            });
        }

        // Ahora se inicializan las 3
        this.initInteresCompuesto();
        this.initCreditoHipotecario();
        this.initPlazoFijo();
    }
};

document.addEventListener('DOMContentLoaded', async () => {

    // ==========================================
    // 1. LÓGICA DEL CARRUSEL (ROTACIÓN TOTAL)
    // ==========================================
    const carouselImages = [
        'Recursos/Img/gettyimages-1789034712-612x612.jpg',
        'Recursos/Img/images.jpg',
        'Recursos/Img/licensed-image.jpg',
        'Recursos/Img/portada.jpg',
        'Recursos/Img/licensed-image.jpg',
        'Recursos/Img/licensed-image.jpg'
    ];
    
    const carousel = document.getElementById('dynamic-carousel');
    const list = document.getElementById('carousel-list'); 
    const timeRunning = document.getElementById('carousel-time-running'); 
    const timeRunningDuration = 7000;
    const timeAutoNext = 7000;
    const timeTransition = 1000;
    let runTimeOut, runNextAuto;

    // Crear elementos del carrusel
    const createCarouselItems = () => {
        if (!list) return;
        list.innerHTML = '';
        carouselImages.forEach((path, index) => {
            const item = document.createElement('div');
            item.className = 'item';
            item.style.backgroundImage = `url(${path})`; 
            const content = document.createElement('div');
            content.className = 'content';
            item.appendChild(content);
            list.appendChild(item);
        });
    }

    // Función de rotación
    function showSlider(type) {
        if (!list || !carousel) return;
        let sliderItemsDom = list.querySelectorAll('.carousel .list .item');

        if (sliderItemsDom.length > 0) {
            if(type === 'next'){
                list.appendChild(sliderItemsDom[0]);
                carousel.classList.add('next');
            } else {
                list.prepend(sliderItemsDom[sliderItemsDom.length - 1]);
                carousel.classList.add('prev');
            }
        }

        clearTimeout(runTimeOut);
        runTimeOut = setTimeout( () => {
            if(carousel) {
                carousel.classList.remove('next');
                carousel.classList.remove('prev');
            }
        }, timeTransition);

        clearTimeout(runNextAuto);
        runNextAuto = setTimeout(() => { showSlider('next'); }, timeAutoNext);
        resetTimeAnimation();
    }

    function resetTimeAnimation() {
        if (!timeRunning) return;
        timeRunning.style.animation = 'none';
        timeRunning.offsetHeight; 
        timeRunning.style.animation = null; 
        timeRunning.style.animation = `runningTime ${timeRunningDuration / 1000}s linear 1 forwards`;
    }
    
    // Iniciar Carrusel
    createCarouselItems();
    resetTimeAnimation();
    runNextAuto = setTimeout(() => { showSlider('next'); }, timeAutoNext); 


    // ==========================================
    // 2. LÓGICA DEL SISTEMA DE RESERVAS
    // ==========================================

    // Referencias DOM
    const menusContainer = document.getElementById('menus-container');
    const modalidadContainer = document.getElementById('modalidad-container');
    const modalContainer = document.getElementById('modal-container');
    const btnNextStep = document.getElementById('btn-next-step');
    const bookingForm = document.getElementById('booking-form');
    const resumenTexto = document.getElementById('resumen-texto');
    const alergiaRadios = document.querySelectorAll('input[name="alergia"]');
    const alergiaDetalle = document.getElementById('alergia-detalle');
    const btnConfirm = document.getElementById('btn-confirm');
    
    const btnComensalesUp = document.getElementById('btn-comensales-up');
    const btnComensalesDown = document.getElementById('btn-comensales-down');
    const comensalesInput = document.getElementById('comensales');
    const btnBack = document.getElementById('btn-back');

    const selectionWarning = document.createElement('p');
    selectionWarning.id = 'selection-warning';
    selectionWarning.textContent = 'Debe elegir una Experiencia';
    if(modalidadContainer) modalidadContainer.insertAdjacentElement('afterend', selectionWarning);

    // Estado de la App
    let seleccion = { menu: null, modalidad: null, comensales: 2 };
    let blockedTimeSlotsData = []; // Datos brutos de bloqueo para validación manual
    let disabledFlatpickrDates = []; // Datos para el calendario visual (días completos)

    // --- FUNCIÓN DE RESETEO ---
    function resetAllState() {
        seleccion.menu = null; 
        seleccion.modalidad = null;
        comensalesInput.value = 2; 
        seleccion.comensales = 2;
        
        if (menusContainer) [...menusContainer.children].forEach(c => c.classList.remove('selected'));
        if (modalidadContainer) [...modalidadContainer.children].forEach(c => c.classList.remove('selected'));
        
        if (modalContainer) modalContainer.classList.add('hidden');
        document.body.classList.remove('modal-active');
        
        validateSelection();
        if (bookingForm) bookingForm.reset(); 
    }

    // --- VALIDACIÓN ESTRICTA DE HORARIO (Pura JS) ---
    const isSlotBlocked = (dateTimeString) => {
        // dateTimeString viene como "YYYY-MM-DDTHH:mm"
        const checkTime = new Date(dateTimeString);
        const checkDateString = dateTimeString.split('T')[0]; // Solo la fecha YYYY-MM-DD
        
        for (const block of blockedTimeSlotsData) {
            // Solo comparamos con bloqueos de esa fecha específica
            if (block.date !== checkDateString) continue;

            // Caso 1: Bloqueo Parcial (tiene horas)
            if (block.startTime && block.endTime) {
                const blockStart = new Date(`${checkDateString} ${block.startTime}`);
                const blockEnd = new Date(`${checkDateString} ${block.endTime}`);
                
                // Si la hora elegida cae DENTRO del rango bloqueado -> ERROR
                if (checkTime >= blockStart && checkTime <= blockEnd) {
                    return true; 
                }
            } 
            // Caso 2: Bloqueo Total (no tiene horas, o son 00:00-23:59)
            else {
                 return true; 
            }
        }
        return false; // Está libre
    };

    // --- CARGAR DISPONIBILIDAD DE FIRESTORE ---
    try {
        if (typeof db !== 'undefined') {
            const snapshot = await db.collection('blockedItems').get();
            snapshot.docs.forEach(doc => {
                const item = doc.data();
                // Guardamos todo el objeto para la validación estricta en el submit
                if (item.date) { 
                    blockedTimeSlotsData.push(item); 
                    
                    // Si es un bloqueo de día completo (sin horas o horas extremas), lo pasamos a Flatpickr para que lo tache visualmente
                    if (!item.startTime || (item.startTime === "00:00" && item.endTime === "23:59")) {
                        disabledFlatpickrDates.push(item.date);
                    }
                }
            });
        }
    } catch (error) { console.error("Error disponibilidad:", error); }

    // --- INICIALIZAR CALENDARIO ---
    const minDate48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000); 
    
    flatpickr("#fecha", { 
        enableTime: true, 
        dateFormat: "Y-m-d H:i", 
        locale: "es", 
        minDate: minDate48Hours,
        disable: disabledFlatpickrDates, // Solo bloquea visualmente días completos
        defaultHour: 16, 
        defaultMinute: 0,
        time_24hr: true 
    });

    // --- CARGAR MENÚS ---
    async function cargarMenus() {
        try {
            if (typeof db !== 'undefined') {
                const querySnapshot = await db.collection('menus').get();
                menusContainer.innerHTML = '';
                querySnapshot.forEach((doc) => {
                    const menu = doc.data();
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.dataset.id = doc.id; 
                    card.dataset.nombre = menu.nombre;
                    const formattedPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(menu.precio || 0);
                    card.innerHTML = `<h3>${menu.nombre}</h3><p class="card-description">${menu.descripcion || ''}</p><p class="card-ideal">${menu.idealPara || ''}</p><p class="card-price">A partir de ${formattedPrice}</p>`;
                    menusContainer.appendChild(card);
                });
            }
        } catch (error) { console.error("Error menús: ", error); }
    }

    // --- MANEJADORES DE EVENTOS ---
    if(btnComensalesUp){
        btnComensalesUp.addEventListener('click', () => {
            let val = parseInt(comensalesInput.value);
            if (val < 15) { comensalesInput.value = val + 1; seleccion.comensales = comensalesInput.value; }
        });
    }
    if(btnComensalesDown){
        btnComensalesDown.addEventListener('click', () => {
            let val = parseInt(comensalesInput.value);
            if (val > 1) { comensalesInput.value = val - 1; seleccion.comensales = comensalesInput.value; }
        });
    }

    function validateSelection() {
        const ok = !!seleccion.menu && !!seleccion.modalidad;
        if(btnNextStep) btnNextStep.disabled = !ok;
        if(selectionWarning) {
            selectionWarning.style.display = ok ? 'none' : 'block';
            if (!seleccion.menu) selectionWarning.textContent = 'Debe elegir una Experiencia';
            else if (!seleccion.modalidad) selectionWarning.textContent = 'Debe elegir una Modalidad';
        }
    }

    function handleSelection(container, key) {
        if(!container) return;
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (!card) return;
            [...container.children].forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            seleccion[key] = card.dataset.nombre || card.dataset.value;
            validateSelection();
        });
    }
    handleSelection(menusContainer, 'menu');
    handleSelection(modalidadContainer, 'modalidad');

    if(btnNextStep){
        btnNextStep.addEventListener('click', () => {
            seleccion.comensales = document.getElementById('comensales').value;
            if (btnNextStep.disabled) return;
            if(resumenTexto) resumenTexto.textContent = `${seleccion.menu}, para ${seleccion.comensales} personas. Modalidad: ${seleccion.modalidad}.`;
            if(modalContainer) {
                modalContainer.classList.remove('hidden');
                document.body.classList.add('modal-active');
            }
        });
    }

    if(btnBack){
        btnBack.addEventListener('click', () => {
            modalContainer.classList.add('hidden');
            document.body.classList.remove('modal-active');
        });
    }

    if(alergiaRadios){
        alergiaRadios.forEach(r => { r.addEventListener('change', (e) => { if(alergiaDetalle) alergiaDetalle.classList.toggle('hidden', e.target.value === 'no'); }); });
    }

    // --- ENVÍO DEL FORMULARIO ---
    if(bookingForm){
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (btnConfirm) {
                btnConfirm.disabled = true;
                btnConfirm.textContent = 'Procesando...';
            }

            // 1. Recolección de Datos
            const fechaInput = document.getElementById('fecha');
            const fechaSeleccionada = fechaInput.value; // YYYY-MM-DDTHH:mm
            const phoneInput = document.getElementById('phone');
            // CORRECCIÓN: Capturamos el valor del teléfono aquí mismo
            const clientPhone = phoneInput ? phoneInput.value : 'No ingresado';

            const fechaEventoObj = new Date(fechaSeleccionada);
            const fechaMinima = new Date(Date.now() + 48 * 60 * 60 * 1000);

            // 2. Validaciones
            // A) Regla de 48 horas
            if (fechaEventoObj < fechaMinima) {
                alert("❌ La reserva debe hacerse con al menos 48 horas de anticipación.");
                btnConfirm.disabled = false; btnConfirm.textContent = 'Confirmar Reserva';
                return;
            }
            
            // B) Regla de Bloqueo de Horario/Día
            const dateTimeStringForCheck = fechaSeleccionada.replace('T', ' '); 
            if (isSlotBlocked(dateTimeStringForCheck)) {
                alert("❌ El horario seleccionado no está disponible. Por favor, elige otra hora.");
                btnConfirm.disabled = false; btnConfirm.textContent = 'Confirmar Reserva';
                return;
            }

            // 3. Construcción del Objeto
            const numComensales = parseInt(seleccion.comensales) || 2;
            
            const reserva = {
                menu: seleccion.menu, 
                modalidad: seleccion.modalidad, 
                comensales: numComensales,
                alergia: document.querySelector('input[name="alergia"]:checked').value,
                alergiaDetalle: alergiaDetalle ? alergiaDetalle.value : '',
                fecha: fechaSeleccionada, 
                direccion: document.getElementById('direccion').value,
                email: document.getElementById('email').value, 
                phone: clientPhone, // Guardamos el teléfono capturado
                estado: 'pendiente', 
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 4. Guardado en Firestore
            try {
                if (typeof db !== 'undefined') {
                    await db.collection('reservations').add(reserva);
                    alert('¡Reserva confirmada! Gracias por elegirnos.');
                    resetAllState();
                } else {
                    alert("Error: No hay conexión con la base de datos.");
                }
            } catch (error) {
                console.error("Error al guardar: ", error);
                alert('Hubo un problema al confirmar. Inténtalo de nuevo.');
            } finally {
                if (btnConfirm) {
                    btnConfirm.disabled = false;
                    btnConfirm.textContent = 'Confirmar Reserva';
                }
            }
        });
    }

    // --- Inicialización ---
    await cargarMenus();
    validateSelection();
});
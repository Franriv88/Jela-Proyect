document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. LÓGICA DEL CARRUSEL ---
    const carouselImages = [
        'Recursos/Img/gettyimages-1789034712-612x612.jpg', 'Recursos/Img/images.jpg',
        'Recursos/Img/licensed-image.jpg', 'Recursos/Img/portada.jpg',
        'Recursos/Img/licensed-image.jpg', 'Recursos/Img/licensed-image.jpg'
    ];
    const carousel = document.getElementById('dynamic-carousel');
    const list = document.getElementById('carousel-list'); 
    const timeRunning = document.getElementById('carousel-time-running'); 
    let runTimeOut, runNextAuto;
    const timeAutoNext = 7000;
    const timeTransition = 1000;

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

    function showSlider(type) {
        let sliderItemsDom = list.querySelectorAll('.carousel .list .item');
        if(type === 'next'){ list.appendChild(sliderItemsDom[0]); carousel.classList.add('next'); } 
        else { list.prepend(sliderItemsDom[sliderItemsDom.length - 1]); carousel.classList.add('prev'); }
        
        clearTimeout(runTimeOut);
        runTimeOut = setTimeout(() => { carousel.classList.remove('next'); carousel.classList.remove('prev'); }, timeTransition);
        clearTimeout(runNextAuto);
        runNextAuto = setTimeout(() => { showSlider('next'); }, timeAutoNext);
        
        if (timeRunning) {
            timeRunning.style.animation = 'none';
            timeRunning.offsetHeight; 
            timeRunning.style.animation = null; 
            timeRunning.style.animation = 'runningTime 7s linear 1 forwards';
        }
    }

    createCarouselItems();
    runNextAuto = setTimeout(() => { showSlider('next'); }, timeAutoNext);


    // --- 2. LÓGICA DE RESERVA ---
    const menusContainer = document.getElementById('menus-container');
    const modalidadContainer = document.getElementById('modalidad-container');
    const modalContainer = document.getElementById('modal-container');
    const btnNextStep = document.getElementById('btn-next-step');
    const bookingForm = document.getElementById('booking-form');
    const resumenTexto = document.getElementById('resumen-texto');
    const alergiaRadios = document.querySelectorAll('input[name="alergia"]');
    const alergiaDetalle = document.getElementById('alergia-detalle');
    const btnConfirm = document.getElementById('btn-confirm');
    const comensalesInput = document.getElementById('comensales');
    const btnComensalesUp = document.getElementById('btn-comensales-up');
    const btnComensalesDown = document.getElementById('btn-comensales-down');
    const btnBack = document.getElementById('btn-back');
    
    const selectionWarning = document.createElement('p');
    selectionWarning.id = 'selection-warning';
    selectionWarning.textContent = 'Debe elegir una Experiencia';
    modalidadContainer.insertAdjacentElement('afterend', selectionWarning);

    let seleccion = { menu: null, modalidad: null, comensales: 2 };
    let blockedTimeSlotsData = []; 

    // --- CARGAR MENÚS ---
    async function cargarMenus() {
        try {
            if (typeof db !== 'undefined') {
                const snapshot = await db.collection('menus').get();
                menusContainer.innerHTML = '';
                snapshot.forEach((doc) => {
                    const menu = doc.data();
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.dataset.id = doc.id; 
                    card.dataset.nombre = menu.nombre;
                    // Formateo de precio simple si Intl falla o no está
                    const precio = menu.precio ? `$${menu.precio}` : 'Consultar';
                    card.innerHTML = `<h3>${menu.nombre}</h3><p class="card-description">${menu.descripcion || ''}</p><p class="card-ideal">${menu.idealPara || ''}</p><p class="card-price">A partir de ${precio}</p>`;
                    menusContainer.appendChild(card);
                });
            }
        } catch (error) { console.error("Error al cargar menús: ", error); }
    }

    // --- CARGAR DISPONIBILIDAD (BLOQUEOS) ---
    try {
        if (typeof db !== 'undefined') {
            const snapshot = await db.collection('blockedItems').get();
            snapshot.docs.forEach(doc => {
                const item = doc.data();
                if (item.date) blockedTimeSlotsData.push(item);
            });
        }
    } catch (error) { console.error("Error cargando disponibilidad:", error); }

    // --- VALIDACIÓN DE FECHA ---
    const isSlotBlocked = (dateStr) => {
        // Bloqueo por DÍA COMPLETO (YYYY-MM-DD)
        return blockedTimeSlotsData.some(block => block.date === dateStr);
    };

    // --- MANEJADORES ---
    btnComensalesUp.addEventListener('click', () => {
        let val = parseInt(comensalesInput.value);
        if (val < 15) { comensalesInput.value = val + 1; seleccion.comensales = comensalesInput.value; }
    });
    btnComensalesDown.addEventListener('click', () => {
        let val = parseInt(comensalesInput.value);
        if (val > 1) { comensalesInput.value = val - 1; seleccion.comensales = comensalesInput.value; }
    });

    function validateSelection() {
        const ok = !!seleccion.menu && !!seleccion.modalidad;
        btnNextStep.disabled = !ok;
        selectionWarning.style.display = ok ? 'none' : 'block';
        if (!seleccion.menu) selectionWarning.textContent = 'Debe elegir una Experiencia';
        else if (!seleccion.modalidad) selectionWarning.textContent = 'Debe elegir una Modalidad';
    }

    const handleCardClick = (container, key) => {
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (!card) return;
            const isSel = card.classList.contains('selected');
            [...container.children].forEach(c => c.classList.remove('selected'));
            if (isSel) seleccion[key] = null;
            else { card.classList.add('selected'); seleccion[key] = card.dataset.nombre || card.dataset.value; }
            validateSelection();
        });
    };
    handleCardClick(menusContainer, 'menu');
    handleCardClick(modalidadContainer, 'modalidad');

    btnNextStep.addEventListener('click', () => {
        if (btnNextStep.disabled) return;
        seleccion.comensales = comensalesInput.value;
        resumenTexto.textContent = `${seleccion.menu}, para ${seleccion.comensales} personas. Modalidad: ${seleccion.modalidad}.`;
        modalContainer.classList.remove('hidden');
        document.body.classList.add('modal-active');
        
        // Inicializar Flatpickr aquí para asegurar que se renderiza en la modal visible
        const minDate48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
        flatpickr("#fecha", { 
            enableTime: true, dateFormat: "Y-m-d H:i", locale: "es", 
            minDate: minDate48h, time_24hr: true,
            disable: blockedTimeSlotsData.map(b => b.date) // Pasamos los días bloqueados a Flatpickr
        });
    });

    btnBack.addEventListener('click', () => {
        modalContainer.classList.add('hidden');
        document.body.classList.remove('modal-active');
    });

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Procesando...';

        const fechaVal = document.getElementById('fecha').value;
        const fechaObj = new Date(fechaVal);
        const fechaStr = fechaVal.split(' ')[0]; // YYYY-MM-DD
        const minDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

        if (fechaObj < minDate) {
            alert("Reserva debe ser con 48h de anticipación.");
            btnConfirm.disabled = false; btnConfirm.textContent = 'Confirmar Reserva';
            return;
        }
        if (isSlotBlocked(fechaStr)) {
            alert("La fecha seleccionada no está disponible.");
            btnConfirm.disabled = false; btnConfirm.textContent = 'Confirmar Reserva';
            return;
        }

        const reserva = {
            menu: seleccion.menu, modalidad: seleccion.modalidad, comensales: comensalesInput.value,
            alergia: document.querySelector('input[name="alergia"]:checked').value,
            alergiaDetalle: document.getElementById('alergia-detalle').value,
            fecha: fechaVal, direccion: document.getElementById('direccion').value,
            email: document.getElementById('email').value, phone: document.getElementById('phone').value,
            estado: 'pendiente', timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('reservations').add(reserva);
            alert('¡Reserva confirmada!');
            bookingForm.reset();
            modalContainer.classList.add('hidden');
            document.body.classList.remove('modal-active');
            seleccion = { menu: null, modalidad: null, comensales: 2 };
            comensalesInput.value = 2;
            [...menusContainer.children].forEach(c => c.classList.remove('selected'));
            [...modalidadContainer.children].forEach(c => c.classList.remove('selected'));
            validateSelection();
        } catch (error) {
            console.error(error); alert('Error al reservar.');
        } finally {
            btnConfirm.disabled = false; btnConfirm.textContent = 'Confirmar Reserva';
        }
    });

    // Inicializar
    await cargarMenus();
    validateSelection();
});
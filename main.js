document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. LÓGICA DEL CARRUSEL ---
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
    const timeRunningDuration = 7000; const timeAutoNext = 7000; const timeTransition = 1000;
    let runTimeOut, runNextAuto;

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
        if (!list || !carousel) return;
        let sliderItemsDom = list.querySelectorAll('.carousel .list .item');
        if (sliderItemsDom.length > 0) {
            if(type === 'next'){ list.appendChild(sliderItemsDom[0]); carousel.classList.add('next'); } 
            else { list.prepend(sliderItemsDom[sliderItemsDom.length - 1]); carousel.classList.add('prev'); }
        }
        clearTimeout(runTimeOut);
        runTimeOut = setTimeout( () => { if(carousel) { carousel.classList.remove('next'); carousel.classList.remove('prev'); } }, timeTransition);
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
    createCarouselItems();
    resetTimeAnimation();
    runNextAuto = setTimeout(() => { showSlider('next'); }, timeAutoNext); 


    // --- 2. LÓGICA DE RESERVAS ---
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

    let seleccion = { menu: null, modalidad: null, comensales: 2 };
    let blockedDates = []; // Días bloqueados completos
    
    function resetAllState() {
        seleccion.menu = null; seleccion.modalidad = null;
        comensalesInput.value = 2; seleccion.comensales = 2;
        if (menusContainer) [...menusContainer.children].forEach(c => c.classList.remove('selected'));
        if (modalidadContainer) [...modalidadContainer.children].forEach(c => c.classList.remove('selected'));
        if (modalContainer) modalContainer.classList.add('hidden');
        document.body.classList.remove('modal-active');
        validateSelection();
        if (bookingForm) bookingForm.reset(); 
    }

    function checkFormValidity() {
        if (bookingForm.checkValidity()) btnConfirm.disabled = false; 
        else btnConfirm.disabled = true;  
    }

    // Cargar Disponibilidad
    try {
        if (typeof db !== 'undefined') {
            const snapshot = await db.collection('blockedItems').get();
            snapshot.docs.forEach(doc => {
                const item = doc.data();
                if (item.date) blockedDates.push(item.date); 
            });
        }
    } catch (error) { console.error("Error disponibilidad:", error); }

    const minDate48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000); 
    
    flatpickr("#fecha", { 
        enableTime: false, dateFormat: "Y-m-d", locale: "es", 
        minDate: minDate48Hours, disable: blockedDates, 
        onChange: function() { checkFormValidity(); }
    });

    async function cargarMenus() {
        try {
            if (typeof db !== 'undefined') {
                const querySnapshot = await db.collection('menus').get();
                menusContainer.innerHTML = '';
                querySnapshot.forEach((doc) => {
                    const menu = doc.data();
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.dataset.id = doc.id; card.dataset.nombre = menu.nombre;
                    const formattedPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(menu.precio || 0);
                    card.innerHTML = `<h3>${menu.nombre}</h3><p class="card-description">${menu.descripcion || ''}</p><p class="card-ideal">${menu.idealPara || ''}</p><p class="card-price">A partir de ${formattedPrice}</p>`;
                    menusContainer.appendChild(card);
                });
            }
        } catch (error) { console.error("Error menús: ", error); }
    }

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
        if(selectionWarning) selectionWarning.style.display = ok ? 'none' : 'block';
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
                checkFormValidity();
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

    if(bookingForm){
        bookingForm.addEventListener('input', checkFormValidity);
        bookingForm.addEventListener('change', checkFormValidity); 
        
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            btnConfirm.disabled = true;
            btnConfirm.textContent = 'Procesando...';
            
            const numComensales = parseInt(seleccion.comensales) || 2;
            
            // --- CAPTURA DE TELÉFONO CRÍTICA ---
            const phoneElement = document.getElementById('phone');
            const clientPhone = phoneElement ? phoneElement.value : 'No ingresado';
            // -----------------------------------

            const reserva = {
                menu: seleccion.menu, 
                modalidad: seleccion.modalidad, 
                comensales: numComensales,
                alergia: document.querySelector('input[name="alergia"]:checked').value,
                alergiaDetalle: alergiaDetalle ? alergiaDetalle.value : '',
                fecha: document.getElementById('fecha').value, 
                direccion: document.getElementById('direccion').value,
                email: document.getElementById('email').value,
                
                phone: clientPhone, // <-- SE GUARDA EL VALOR CAPTURADO
                
                estado: 'pendiente', 
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

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
                btnConfirm.disabled = true; 
                btnConfirm.textContent = 'Confirmar Reserva';
            }
        });
    }

    await cargarMenus();
    validateSelection();
});
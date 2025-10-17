document.addEventListener('DOMContentLoaded', async () => {

    // --- LÓGICA DEL CARRUSEL EN ABANICO ---

    // 1. Define la imagen principal y la lista de imágenes para las miniaturas.
    const mainHeaderImage = 'Recursos/Img/portada.jpg'; // Imagen principal fija del header
    const carouselImages = [
        'Recursos/Img/gettyimages-1789034712-612x612.jpg',
        'Recursos/Img/images.jpg',
        'Recursos/Img/licensed-image (1).jpg',
        'Recursos/Img/licensed-image (2).jpg',
        'Recursos/Img/licensed-image.jpg'
        // Puedes agregar más imágenes aquí y el sistema las incluirá en el ciclo
    ];

    const mainImageContainer = document.querySelector('.carousel-main-image');
    const thumbnailsContainer = document.querySelector('.carousel-thumbnails');
    let currentIndex = 0; // Controla qué imagen está al frente del abanico

    if (mainImageContainer && carouselImages.length > 0) {
        // 2. Cargar la imagen principal del header.
        mainImageContainer.innerHTML = `<img src="${mainHeaderImage}" alt="Bienvenida a Jelambi Chef">`;
        const mainImage = mainImageContainer.querySelector('img');

        // 3. Función para renderizar y actualizar las miniaturas en abanico.
        const renderThumbnails = () => {
            thumbnailsContainer.innerHTML = ''; // Limpiar miniaturas existentes para redibujar
            
            // Mostrar un máximo de 3 miniaturas visibles a la vez.
            for (let i = 0; i < 3; i++) {
                if (currentIndex + i >= carouselImages.length) {
                    // Si no hay suficientes imágenes para mostrar 3, no hacer nada.
                    continue;
                }
                
                // El índice de la imagen a mostrar en la lista original
                const imageIndex = currentIndex + i;
                const imageUrl = carouselImages[imageIndex];

                const thumb = document.createElement('img');
                thumb.src = imageUrl;
                thumb.dataset.index = imageIndex; // Guardamos el índice original
                thumb.className = `thumbnail pos-${i + 1}`; // Asigna la clase de posición (pos-1, pos-2, pos-3)
                
                thumbnailsContainer.appendChild(thumb);

                // 4. Añadir el evento de clic a cada miniatura.
                thumb.addEventListener('click', () => {
                    const clickedIndex = parseInt(thumb.dataset.index);

                    // Reemplazar la imagen principal fija por la imagen clickeada
                    mainImage.style.opacity = '0';
                    setTimeout(() => {
                        mainImage.src = carouselImages[clickedIndex];
                        mainImage.style.opacity = '1';
                    }, 500);

                    // Si se hace clic en la primera tarjeta, avanza el carrusel
                    if (i === 0 && carouselImages.length > currentIndex + 1) {
                        currentIndex++;
                    } else {
                        // Si se hace clic en otra, esa pasa al frente
                        currentIndex = clickedIndex;
                    }
                    
                    renderThumbnails(); // Volver a renderizar el abanico con el nuevo orden
                });
            }
        };

        // 5. Renderizar las miniaturas por primera vez al cargar la página.
        renderThumbnails();
    }

    // --- FIN DE LA LÓGICA DEL CARRUSEL ---


    // --- LÓGICA DEL SISTEMA DE RESERVAS ---

    // Referencias a los elementos del DOM para el formulario.
    const menusContainer = document.getElementById('menus-container');
    const modalidadContainer = document.getElementById('modalidad-container');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const btnNextStep = document.getElementById('btn-next-step');
    const bookingForm = document.getElementById('booking-form');
    const resumenTexto = document.getElementById('resumen-texto');
    const alergiaRadios = document.querySelectorAll('input[name="alergia"]');
    const alergiaDetalle = document.getElementById('alergia-detalle');
    const btnConfirm = document.getElementById('btn-confirm');

    let seleccion = {
        menu: null,
        modalidad: null,
        comensales: 2
    };
    let blockedDates = [];

    // Cargar las fechas bloqueadas por el chef desde Firestore.
    try {
        const snapshot = await db.collection('availability').get();
        blockedDates = snapshot.docs.map(doc => doc.id);
        console.log("Días no disponibles cargados:", blockedDates);
    } catch (error) {
        console.error("Error al cargar la disponibilidad:", error);
    }

    // Inicializar el calendario (flatpickr) deshabilitando los días no disponibles.
    flatpickr("#fecha", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        locale: "es",
        minDate: "today",
        disable: blockedDates,
        time_24hr: true
    });

    // Cargar los menús desde Firestore.
    async function cargarMenus() {
        try {
            const querySnapshot = await db.collection('menus').get();
            menusContainer.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const menu = doc.data();
                const card = document.createElement('div');
                card.classList.add('card');
                card.textContent = menu.nombre;
                card.dataset.id = doc.id;
                card.dataset.nombre = menu.nombre;
                menusContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Error al cargar menús: ", error);
        }
    }

    // Manejar la selección de tarjetas (menú y modalidad).
    function handleSelection(container, key) {
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('card')) {
                [...container.children].forEach(child => child.classList.remove('selected'));
                e.target.classList.add('selected');
                seleccion[key] = key === 'menu' ? e.target.dataset.nombre : e.target.dataset.value;
            }
        });
    }

    handleSelection(menusContainer, 'menu');
    handleSelection(modalidadContainer, 'modalidad');

    // Manejar el paso de la etapa 1 a la 2.
    btnNextStep.addEventListener('click', () => {
        seleccion.comensales = document.getElementById('comensales').value;
        if (!seleccion.menu || !seleccion.modalidad) {
            alert('Por favor, selecciona un menú y una modalidad.');
            return;
        }
        resumenTexto.textContent = `${seleccion.menu}, para ${seleccion.comensales} personas. Modalidad: ${seleccion.modalidad.replace('-', ' ')}.`;
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
    });

    // Lógica del formulario (alergias y validación).
    alergiaRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            alergiaDetalle.classList.toggle('hidden', e.target.value === 'no');
        });
    });

    bookingForm.addEventListener('keyup', () => {
        btnConfirm.disabled = !bookingForm.checkValidity();
    });

    // Enviar la reserva a Firestore.
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Procesando...';
        const reserva = {
            ...seleccion,
            alergia: document.querySelector('input[name="alergia"]:checked').value,
            alergiaDetalle: alergiaDetalle.value,
            fecha: document.getElementById('fecha').value,
            direccion: document.getElementById('direccion').value,
            email: document.getElementById('email').value,
            estado: 'pendiente',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('reservations').add(reserva);
            alert('¡Reserva confirmada! Gracias por elegirnos.');
            bookingForm.reset();
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
            [...menusContainer.children].forEach(child => child.classList.remove('selected'));
            [...modalidadContainer.children].forEach(child => child.classList.remove('selected'));
        } catch (error) {
            console.error("Error al guardar la reserva: ", error);
            alert('Hubo un problema al confirmar tu reserva.');
        } finally {
            btnConfirm.disabled = false;
            btnConfirm.textContent = 'Confirmar Reserva';
        }
    });

    // Iniciar la carga de los menús al cargar la página.
    cargarMenus();
});
document.addEventListener('DOMContentLoaded', async () => {

    // --- LÓGICA DEL CARRUSEL EN ABANICO (VERSIÓN FINAL) ---

    const mainHeaderImage = 'Recursos/Img/portada.jpg';
    const carouselImages = [
        'Recursos/Img/gettyimages-1789034712-612x612.jpg',
        'Recursos/Img/images.jpg',
        'Recursos/Img/licensed-image (1).jpg',
        'Recursos/Img/portada.jpg',
        'Recursos/Img/licensed-image (2).jpg',
        'Recursos/Img/licensed-image.jpg'
    ];

    const mainImageContainer = document.querySelector('.carousel-main-image');
    const thumbnailsContainer = document.querySelector('.carousel-thumbnails');
    let currentIndex = 0; // Siempre apunta al índice de la imagen en la posición 1 (adelante)

    if (mainImageContainer && carouselImages.length > 0) {
        mainImageContainer.innerHTML = `<img src="${mainHeaderImage}" alt="Bienvenida a Jelambi Chef">`;
        const mainImage = mainImageContainer.querySelector('img');

        const renderThumbnails = () => {
            thumbnailsContainer.innerHTML = '';
            
            const visibleThumbnails = 3;
            for (let i = 0; i < visibleThumbnails; i++) {
                // Usamos el operador % (módulo) para crear un bucle infinito y seguro
                const imageIndex = (currentIndex + i) % carouselImages.length;
                
                // Si solo hay 1 o 2 imágenes, no queremos repetir la misma en el abanico
                if (i > 0 && imageIndex === currentIndex) break;

                const imageUrl = carouselImages[imageIndex];

                const thumb = document.createElement('img');
                thumb.src = imageUrl;
                thumb.className = `thumbnail pos-${i + 1}`;
                
                thumb.addEventListener('click', () => {
                    // 1. La imagen clickeada se convierte en la principal del header
                    mainImage.style.opacity = '0';
                    setTimeout(() => {
                        mainImage.src = imageUrl;
                        mainImage.style.opacity = '1';
                    }, 400);

                    // 2. La siguiente imagen en la lista pasa a estar al frente del abanico
                    currentIndex = (imageIndex + 1) % carouselImages.length;
                    
                    // 3. Volver a dibujar el abanico con el nuevo orden
                    renderThumbnails();
                });
                
                thumbnailsContainer.appendChild(thumb);
            }
        };

        renderThumbnails(); // Dibujar el carrusel por primera vez
    }

    // --- FIN DE LA LÓGICA DEL CARRUSEL ---


    // --- LÓGICA DEL SISTEMA DE RESERVAS (SIN CAMBIOS) ---

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

    try {
        const snapshot = await db.collection('availability').get();
        blockedDates = snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error al cargar la disponibilidad:", error);
    }

    flatpickr("#fecha", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        locale: "es",
        minDate: "today",
        disable: blockedDates,
        time_24hr: true
    });

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

    alergiaRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            alergiaDetalle.classList.toggle('hidden', e.target.value === 'no');
        });
    });

    bookingForm.addEventListener('keyup', () => {
        btnConfirm.disabled = !bookingForm.checkValidity();
    });

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

    cargarMenus();
});
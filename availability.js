// --- Security Check ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const calendarInput = document.getElementById('calendar-input');
    const blockForm = document.getElementById('day-block-form');
    const blockedSlotsList = document.getElementById('blocked-slots-list');
    
    const blockedItemsCollection = db.collection('blockedItems'); 

    let selectedDate = null;

    // Inicializar Flatpickr
    flatpickr(calendarInput, {
        dateFormat: "Y-m-d",
        locale: "es",
        minDate: "today",
        onChange: (selectedDates, dateStr) => {
            selectedDate = dateStr;
        }
    });

    // --- FUNCIÓN DE FORMATEO DE FECHA ---
    // Convierte "2025-12-11" a "11/DIC/2025" de forma segura (sin problemas de zona horaria)
    const formatearFecha = (fechaString) => {
        if (!fechaString) return "";
        
        const partes = fechaString.split('-'); // Divide año, mes, día
        if (partes.length !== 3) return fechaString;

        const anio = partes[0];
        const mesIndex = parseInt(partes[1]) - 1; // Meses en array van de 0 a 11
        const dia = partes[2];

        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const mesLetras = meses[mesIndex] || "---";

        return `${dia} ${mesLetras} ${anio}`;
    };
    
    // --- Cargar y Listar Bloqueos ---
    const loadAllBlockedItems = () => {
        blockedItemsCollection.onSnapshot((snapshot) => {
            const blockedItems = snapshot.docs.map(doc => ({
                id: doc.id, 
                ...doc.data()
            }));

            renderItems(blockedItems); 
        });
    };

    // Función para renderizar
    const renderItems = (items = []) => {
        blockedSlotsList.innerHTML = '';
        if (items.length === 0) {
            blockedSlotsList.innerHTML = '<p>Todos los días están disponibles.</p>';
            return;
        }

        // Ordenar por fecha (usamos la fecha original YYYY-MM-DD para ordenar correctamente)
        items.sort((a, b) => a.date.localeCompare(b.date));

        items.forEach((item, index) => {
            const div = document.createElement('div');
            
            // USAMOS LA FUNCIÓN DE FORMATEO AQUÍ
            const fechaVisual = formatearFecha(item.date);

            div.innerHTML = `
                <span>Día Bloqueado: <strong>${fechaVisual}</strong></span>
                <div class="actions">
                    <button type="button" class="btn-danger" data-action="delete" data-id="${item.id}" style="margin-top: 0;">Desbloquear</button>
                </div>
            `;
            blockedSlotsList.appendChild(div);

            div.querySelector('[data-action="delete"]').addEventListener('click', () => {
                deleteItem(item.id);
            });
        });
    };

    // --- Añadir/Eliminar Bloqueo ---
    blockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedDate) {
            alert("Por favor, selecciona un día.");
            return;
        }
        
        const dateRef = blockedItemsCollection.doc(selectedDate); 
        const fechaVisual = formatearFecha(selectedDate); // Formateamos también para la alerta
        
        try {
            const doc = await dateRef.get();

            if (doc.exists) {
                await dateRef.delete();
                alert(`Día ${fechaVisual} DESBLOQUEADO.`);
            } else {
                await dateRef.set({ date: selectedDate, isBlocked: true }); 
                alert(`Día ${fechaVisual} BLOQUEADO.`);
            }
            
        } catch (error) {
            console.error("Error al gestionar el bloqueo:", error);
            alert("Error al guardar el bloqueo.");
        }
    });

    // --- Eliminar Bloqueo ---
    const deleteItem = async (itemId) => {
        if (!confirm("¿Seguro que deseas desbloquear este día?")) return;

        try {
            await blockedItemsCollection.doc(itemId).delete();
            // alert("Día desbloqueado."); 
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    // --- Borrado Masivo ---
    const btnClearAll = document.getElementById('btn-clear-all');

    const clearAllAvailability = async () => {
        if (!confirm("ADVERTENCIA: ¿Estás seguro de que deseas borrar TODA la disponibilidad de días bloqueados?")) return;

        btnClearAll.textContent = 'Borrando...';
        btnClearAll.disabled = true;

        try {
            const snapshot = await blockedItemsCollection.get();
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            alert("¡Todo el calendario está ahora abierto!");
        } catch (error) {
            console.error("Error al borrar colección:", error);
        } finally {
            btnClearAll.textContent = 'Borrar Toda la Disponibilidad';
            btnClearAll.disabled = false;
        }
    };

    if (btnClearAll) {
         btnClearAll.addEventListener('click', clearAllAvailability);
    }
    
    loadAllBlockedItems();
});
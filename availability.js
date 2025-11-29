// --- Security Check ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const calendarInput = document.getElementById('calendar-input');
    const blockForm = document.getElementById('day-block-form'); // NUEVA REFERENCIA
    const blockedSlotsList = document.getElementById('blocked-slots-list');
    
    // CAMBIO CLAVE: Ahora el ID del documento será la FECHA (YYYY-MM-DD)
    const blockedItemsCollection = db.collection('blockedItems'); 

    let selectedDate = null;

    // Inicializar Flatpickr para seleccionar el día de bloqueo
    flatpickr(calendarInput, {
        dateFormat: "Y-m-d",
        locale: "es",
        minDate: "today",
        onChange: (selectedDates, dateStr) => {
            selectedDate = dateStr;
        }
    });
    
    // --- FUNCIÓN CENTRAL: Cargar y Listar TODOS los Bloqueos ---
    const loadAllBlockedItems = () => {
        blockedItemsCollection.onSnapshot((snapshot) => {
            const blockedItems = snapshot.docs.map(doc => ({
                id: doc.id, 
                ...doc.data()
            }));

            renderItems(blockedItems); 
        });
    };

    // Función para renderizar TODOS los ítems bloqueados
    const renderItems = (items = []) => {
        blockedSlotsList.innerHTML = '';
        if (items.length === 0) {
            blockedSlotsList.innerHTML = '<p>Todos los días están disponibles.</p>';
            return;
        }

        // Ordenar por fecha
        items.sort((a, b) => a.date.localeCompare(b.date));

        items.forEach((item, index) => {
            const div = document.createElement('div');
            
            // Solo muestra la fecha
            div.innerHTML = `
                <span>Día Bloqueado: ${item.date}</span>
                <div class="actions">
                    <button type="button" class="btn-danger" data-action="delete" data-id="${item.id}" style="margin-top: 0;">Desbloquear</button>
                </div>
            `;
            blockedSlotsList.appendChild(div);

            // Conectar el botón de desbloqueo
            div.querySelector('[data-action="delete"]').addEventListener('click', () => {
                deleteItem(item.id);
            });
        });
    };

    // --- 1. Añadir/Eliminar Bloqueo de Día Completo ---
    blockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedDate) {
            alert("Por favor, selecciona un día.");
            return;
        }
        
        const dateRef = blockedItemsCollection.doc(selectedDate); // Usamos la fecha como ID
        
        try {
            const doc = await dateRef.get();

            if (doc.exists) {
                // Si ya existe (bloqueado), lo eliminamos (desbloqueamos)
                await dateRef.delete();
                alert(`Día ${selectedDate} DESBLOQUEADO.`);
            } else {
                // Si no existe, lo creamos (bloqueamos)
                // Guardamos la fecha y un flag simple
                await dateRef.set({ date: selectedDate, isBlocked: true }); 
                alert(`Día ${selectedDate} BLOQUEADO.`);
            }
            
            // loadAllBlockedItems se llama automáticamente por onSnapshot
            
        } catch (error) {
            console.error("Error al gestionar el bloqueo:", error);
            alert("Error al guardar el bloqueo del día.");
        }
    });

    // --- 2. Eliminar Bloqueo (Usado por el botón Desbloquear) ---
    const deleteItem = async (itemId) => {
        if (!confirm("¿Seguro que deseas desbloquear este día?")) return;

        try {
            await blockedItemsCollection.doc(itemId).delete();
            alert("Día desbloqueado.");
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };


    // --- 3. Borrado Masivo (Limpiar Colección) ---
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

            alert("¡Disponibilidad borrada con éxito! Todo el calendario está ahora abierto.");
        } catch (error) {
            console.error("Error al borrar la colección:", error);
            alert("Error al borrar la disponibilidad. Revisa la consola.");
        } finally {
            btnClearAll.textContent = 'Borrar Toda la Disponibilidad';
            btnClearAll.disabled = false;
        }
    };

    if (btnClearAll) {
         btnClearAll.addEventListener('click', clearAllAvailability);
    }
    
    // Iniciar la carga y escucha en tiempo real
    loadAllBlockedItems();
});
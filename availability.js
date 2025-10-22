// --- Security Check ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const calendarInput = document.getElementById('calendar-input');
    const slotForm = document.getElementById('time-slot-form');
    const blockedSlotsList = document.getElementById('blocked-slots-list');
    
    // CAMBIO CLAVE: Colección única para todos los bloqueos
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
            blockedSlotsList.innerHTML = '<p>No hay horarios o días bloqueados actualmente.</p>';
            return;
        }

        // Ordenar por fecha y luego por hora de inicio
        items.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        });

        items.forEach((item, index) => {
            const div = document.createElement('div');
            // Muestra FECHA COMPLETA y horario
            div.innerHTML = `
                <span>${item.date}: ${item.startTime} - ${item.endTime}</span>
                <div class="actions">
                    <button type="button" class="btn-secondary btn-sm" data-action="edit" data-id="${item.id}" style="margin-top: 0;">Editar</button>
                    <button type="button" class="btn-danger btn-sm" data-action="delete" data-id="${item.id}">Eliminar</button>
                </div>
            `;
            blockedSlotsList.appendChild(div);

            // Conectar botones
            div.querySelector('[data-action="delete"]').addEventListener('click', () => {
                deleteItem(item.id);
            });
            div.querySelector('[data-action="edit"]').addEventListener('click', () => {
                editSlot(item);
            });
        });
    };

    // --- 1. Añadir Nuevo Bloqueo ---
    slotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedDate) {
            alert("Por favor, selecciona un día en el calendario.");
            return;
        }

        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        if (startTime >= endTime) {
             alert("La hora de inicio debe ser anterior a la hora de fin.");
             return;
        }

        const newBlockedItem = { 
            date: selectedDate, 
            startTime: startTime, 
            endTime: endTime 
        };
        
        try {
            await blockedItemsCollection.add(newBlockedItem); // Añadir documento con ID automático
            alert(`Horario bloqueado: ${selectedDate} de ${startTime} a ${endTime}.`);
            slotForm.reset();
            // loadAllBlockedItems se llama automáticamente por onSnapshot
            
        } catch (error) {
            console.error("Error saving slot:", error);
            alert("Error al guardar el horario.");
        }
    });

    // --- 2. Editar Bloqueo (Fecha + Rango) ---
    const editSlot = async (item) => {
        const newDate = prompt(`Editando ${item.date}: Ingrese nueva fecha (YYYY-MM-DD):`, item.date);
        if (newDate === null || newDate.trim() === '') return;
        
        const newStartTime = prompt(`Editando ${newDate}: Ingrese nueva hora de inicio (actual: ${item.startTime}):`, item.startTime);
        if (newStartTime === null) return;
        
        const newEndTime = prompt(`Editando ${newDate}: Ingrese nueva hora de fin (actual: ${item.endTime}):`, item.endTime);
        if (newEndTime === null) return;

        if (newStartTime >= newEndTime) {
            alert("La hora de inicio debe ser anterior a la hora de fin.");
            return;
        }

        const itemRef = blockedItemsCollection.doc(item.id);
        
        try {
            const updatedData = {
                date: newDate.trim(),
                startTime: newStartTime,
                endTime: newEndTime
            };
            await itemRef.update(updatedData);
            alert(`Bloqueo actualizado a: ${newDate} de ${newStartTime} a ${newEndTime}.`);
            // loadAllBlockedItems se llama automáticamente
        } catch (error) {
            console.error("Error updating slot:", error);
            alert("Error al actualizar el horario.");
        }
    };


    // --- 3. Eliminar Bloqueo ---
    const deleteItem = async (itemId) => {
        if (!confirm("¿Seguro que deseas eliminar este bloqueo?")) return;

        try {
            await blockedItemsCollection.doc(itemId).delete();
            alert("Bloqueo eliminado.");
            // loadAllBlockedItems se llama automáticamente
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };


    // --- 4. Borrado Masivo (Limpiar Colección) ---
    const btnClearAll = document.getElementById('btn-clear-all');

    const clearAllAvailability = async () => {
        if (!confirm("ADVERTENCIA: ¿Estás seguro de que deseas borrar TODA la disponibilidad de horarios y días?")) return;

        btnClearAll.textContent = 'Borrando...';
        btnClearAll.disabled = true;

        try {
            // Usamos un batch para borrar masivamente
            const snapshot = await blockedItemsCollection.get();
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            alert("¡Disponibilidad borrada con éxito!");
        } catch (error) {
            console.error("Error al borrar la colección de disponibilidad:", error);
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
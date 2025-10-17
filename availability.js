// --- Security Check ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const availabilityCollection = db.collection('availability');
    let blockedDates = [];

    // Function to initialize or re-render the calendar
    const initCalendar = () => {
        flatpickr("#availability-calendar", {
            inline: true, // Show the calendar directly on the page
            mode: "multiple", // Allow selecting multiple dates
            dateFormat: "Y-m-d",
            locale: "es", // Use Spanish
            minDate: "today",
            disable: blockedDates, // This is where we tell the calendar which dates to block
            onChange: async (selectedDates, dateStr, instance) => {
                // This function is complex, so we handle clicks in the simple "onClick" event
            },
            // The onClick event is perfect for toggling
            onClick: async (selectedDates, dateStr, instance) => {
                // Format the clicked date to YYYY-MM-DD
                const clickedDate = instance.formatDate(selectedDates[0], "Y-m-d");
                const dateRef = availabilityCollection.doc(clickedDate);

                try {
                    const doc = await dateRef.get();
                    if (doc.exists) {
                        // If the date is already blocked, unblock it (delete the document)
                        await dateRef.delete();
                        console.log(`Fecha ${clickedDate} desbloqueada.`);
                    } else {
                        // If the date is not blocked, block it (create the document)
                        await dateRef.set({ isBlocked: true });
                        console.log(`Fecha ${clickedDate} bloqueada.`);
                    }
                } catch (error) {
                    console.error("Error al actualizar la disponibilidad: ", error);
                }
            }
        });
    };

    // Listen for real-time changes in availability
    availabilityCollection.onSnapshot((snapshot) => {
        blockedDates = snapshot.docs.map(doc => doc.id); // The doc ID is the date itself
        console.log("Fechas bloqueadas actualizadas:", blockedDates);
        initCalendar(); // Re-initialize the calendar with the new blocked dates
    });
});
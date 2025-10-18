// --- Security Check ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const editorContainer = document.getElementById('menu-editor-container');
    const menusCollection = db.collection('menus');

    const loadMenusForEditing = async () => {
        try {
            const snapshot = await menusCollection.get();
            editorContainer.innerHTML = ''; // Limpiar

            snapshot.forEach(doc => {
                const menu = doc.data();
                const menuId = doc.id;

                const form = document.createElement('form');
                form.className = 'menu-editor-form';
                form.dataset.id = menuId;
                form.innerHTML = `
                    <h3>${menu.nombre}</h3>
                    <label>Descripción:</label>
                    <textarea name="descripcion">${menu.descripcion || ''}</textarea>
                    <label>Ideal para:</label>
                    <input type="text" name="idealPara" value="${menu.idealPara || ''}">
                    <label>Precio (ej: 15000):</label>
                    <input type="number" name="precio" value="${menu.precio || 0}">
                    <button type="submit">Guardar Cambios</button>
                `;
                editorContainer.appendChild(form);

                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const button = form.querySelector('button');
                    button.textContent = 'Guardando...';
                    button.disabled = true;

                    const updatedData = {
                        descripcion: form.querySelector('[name="descripcion"]').value,
                        idealPara: form.querySelector('[name="idealPara"]').value,
                        precio: Number(form.querySelector('[name="precio"]').value)
                    };

                    try {
                        await menusCollection.doc(menuId).update(updatedData);
                        alert(`¡Menú "${menu.nombre}" actualizado con éxito!`);
                    } catch (error) {
                        console.error("Error al actualizar el menú:", error);
                        alert("Hubo un error al guardar los cambios.");
                    } finally {
                        button.textContent = 'Guardar Cambios';
                        button.disabled = false;
                    }
                });
            });

        } catch (error) {
            console.error("Error al cargar los menús:", error);
            editorContainer.innerHTML = '<p>No se pudieron cargar los menús para editar.</p>';
        }
    };

    loadMenusForEditing();
});
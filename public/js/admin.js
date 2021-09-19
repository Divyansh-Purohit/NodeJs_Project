//js code thaat will run on the client's side.


const deleteProduct = (btn) => {
    // console.log(btn);
    const prodId = btn.parentNode.querySelector('[name=productId]').value;
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value;

    const productElement = btn.closest('article');

    fetch('/product/' + prodId, {
        method: "DELETE",
        headers: {
            'csrf-token': csrf
        }
    })
    .then(result => {
        return result.json();
    })
    .then(data => {
        // console.log(data);
        productElement.remove();
    })
    .catch(err => {
        console.log(err);
    })
}

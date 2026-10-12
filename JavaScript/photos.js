async function GetPhoto(request, env) {
	// Get the object key from the URL path
	// For example: /images/cat.png → images/cat.png
	const url = new URL(request.url);
	const key = url.pathname.slice(1);

	// GET: Retrieve the object from R2
	const object = await env.PHOTOS.get(key);
	if (object === null) {
		return new Response("Object not found", { status: 404 });
	}
	return new Response(object.body);
}


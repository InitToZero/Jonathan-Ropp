import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase-config.js";

const RECIPE_TABLE = "tbl_recipes";
const RECIPE_COLUMNS = "uid_primary_key,txt_title,txt_description,txt_chef,jsb_ingredients,jsb_directions,jsb_notes,txt_photo_path,uid_created_by,tmz_created_at,uid_updated_by,tmz_updated_at,bool_active";
const PHOTO_BUCKET = "recipe-photos";
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const statusMessage = document.querySelector("#recipe-status");
const formStatus = document.querySelector("#form-status");
const signInForm = document.querySelector("#sign-in-form");
const signInEmail = document.querySelector("#sign-in-email");
const sessionActions = document.querySelector("#session-actions");
const signOutButton = document.querySelector("#sign-out-button");
const recipeUser = document.querySelector("#recipe-user");
const recipeEditor = document.querySelector("#recipe-editor");
const recipeForm = document.querySelector("#recipe-form");
const recipeList = document.querySelector("#recipe-list");
const recipeCard = document.querySelector("#recipe-card");
const newRecipeButton = document.querySelector("#new-recipe-button");
const formFields = {
    id: document.querySelector("#recipe-id"),
    title: document.querySelector("#recipe-name"),
    description: document.querySelector("#recipe-description"),
    chef: document.querySelector("#recipe-chef"),
    ingredients: document.querySelector("#recipe-ingredients"),
    directions: document.querySelector("#recipe-directions"),
    notes: document.querySelector("#recipe-notes"),
    photo: document.querySelector("#recipe-photo"),
};

const hasConfiguration = SUPABASE_URL.startsWith("https://")
    && SUPABASE_PUBLISHABLE_KEY !== "YOUR_SUPABASE_PUBLISHABLE_KEY";

if (!hasConfiguration) {
    statusMessage.textContent = "Add your Supabase project URL and publishable key in JavaScript/supabase-config.js to connect recipes.";
    signInForm.hidden = true;
    recipeList.replaceChildren(makeMessageItem("Recipe list is not connected yet."));
} else {
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    let recipes = [];
    let selectedRecipeId = null;
    let currentUser = null;

    signInForm.addEventListener("submit", sendSignInLink);
    signOutButton.addEventListener("click", signOut);
    recipeForm.addEventListener("submit", saveRecipe);
    newRecipeButton.addEventListener("click", startNewRecipe);

    initialize();

    async function initialize() {
        supabase.auth.onAuthStateChange((event, session) => {
            currentUser = session?.user ?? null;
            updateSessionView();
            if (event !== "TOKEN_REFRESHED") {
                setTimeout(() => {
                    void loadRecipes();
                }, 0);
            }
        });

        const { data, error } = await supabase.auth.getSession();
        if (error) {
            statusMessage.textContent = `Could not check sign-in status: ${error.message}`;
            return;
        }

        currentUser = data.session?.user ?? null;
        updateSessionView();
        await loadRecipes();
    }

    function updateSessionView() {
        const signedIn = currentUser !== null;
        signInForm.hidden = signedIn;
        sessionActions.hidden = !signedIn;
        recipeEditor.hidden = !signedIn;
        recipeUser.hidden = !signedIn;
        recipeUser.textContent = signedIn ? `Signed in as ${currentUser.email}` : "";
        statusMessage.textContent = signedIn
            ? "You can add or edit recipes while signed in."
            : "To add/edit, enter an authorized email to receive a one-time sign-in link.";
    }

    async function sendSignInLink(event) {
        event.preventDefault();
        statusMessage.textContent = "Sending sign-in link...";

        const { error } = await supabase.auth.signInWithOtp({
            email: signInEmail.value.trim(),
            options: {
                shouldCreateUser: false,
                emailRedirectTo: window.location.href.split("#")[0],
            },
        });

        statusMessage.textContent = error
            ? `Could not send sign-in link: ${error.message}`
            : "If that email belongs to an authorized account, a sign-in link is on its way.";
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            statusMessage.textContent = `Could not sign out: ${error.message}`;
            return;
        }
        statusMessage.textContent = "You are signed out.";
    }

    async function loadRecipes() {
        recipeList.replaceChildren(makeMessageItem("Loading recipes..."));
        const { data, error } = await supabase
            .from(RECIPE_TABLE)
            .select(RECIPE_COLUMNS)
            .eq("bool_active", true)
            .order("txt_title", { ascending: true });

        if (error) {
            recipeList.replaceChildren(makeMessageItem("Recipes could not be loaded."));
            recipeCard.replaceChildren(makeParagraph(`Could not load recipes: ${error.message}`, "recipe-empty"));
            return;
        }

        recipes = data;
        if (recipes.length === 0) {
            selectedRecipeId = null;
            recipeList.replaceChildren(makeMessageItem("No recipes yet."));
            recipeCard.replaceChildren(makeParagraph("No recipes have been added yet.", "recipe-empty"));
            return;
        }

        if (!recipes.some((recipe) => recipe.uid_primary_key === selectedRecipeId)) {
            selectedRecipeId = recipes[0].uid_primary_key;
        }

        renderRecipeList();
        renderSelectedRecipe();
    }

    function renderRecipeList() {
        recipeList.replaceChildren();
        recipes.forEach((recipe) => {
            const item = document.createElement("li");
            const button = document.createElement("button");
            const title = document.createElement("span");
            const chef = document.createElement("span");

            button.type = "button";
            button.className = "recipe-list-button";
            button.setAttribute("aria-pressed", String(recipe.uid_primary_key === selectedRecipeId));
            title.textContent = recipe.txt_title;
            chef.className = "recipe-list-note";
            chef.textContent = recipe.txt_chef ? `Chef: ${recipe.txt_chef}` : "Secret or unknown chef";
            button.append(title, chef);
            button.addEventListener("click", () => {
                selectedRecipeId = recipe.uid_primary_key;
                recipeForm.reset();
                formStatus.textContent = "";
                renderRecipeList();
                renderSelectedRecipe();
                if (!currentUser) {
                    formFields.id.value = "";
                }
            });
            item.append(button);
            recipeList.append(item);
        });
    }

    function renderSelectedRecipe() {
        const recipe = recipes.find((item) => item.uid_primary_key === selectedRecipeId);
        if (!recipe) {
            recipeCard.replaceChildren(makeParagraph("Select a recipe to view it.", "recipe-empty"));
            return;
        }

        const header = document.createElement("header");
        header.className = "recipe-header";
        const titleContainer = document.createElement("div");
        titleContainer.className = "recipe-title";
        titleContainer.append(
            makeHeading(2, recipe.txt_title),
        );
        if (recipe.txt_description) {
            titleContainer.append(makeParagraph(recipe.txt_description, "recipe-description"));
        }

        const meta = document.createElement("dl");
        meta.className = "recipe-meta";
        meta.append(
            makeMetaField("Chef:", recipe.txt_chef || "Not specified"),
            makeMetaField("Last Updated:", formatDate(recipe.tmz_updated_at)),
        );
        titleContainer.append(meta);

        const photo = document.createElement("figure");
        photo.className = "recipe-photo";
        if (recipe.txt_photo_path) {
            const image = document.createElement("img");
            image.src = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(recipe.txt_photo_path).data.publicUrl;
            image.alt = `Photo of ${recipe.txt_title}`;
            photo.append(image);
        } else {
            photo.setAttribute("role", "img");
            photo.setAttribute("aria-label", `No photo added for ${recipe.txt_title}`);
            photo.append(makeParagraph("No photo added", ""));
        }
        header.append(titleContainer, photo);

        const details = document.createElement("div");
        details.className = "recipe-details";
        details.append(
            makeRecipeSection("Ingredients", recipe.jsb_ingredients, "ul", "ingredients-list"),
            makeRecipeSection("Directions", recipe.jsb_directions, "ol"),
        );

        const directions = details.lastElementChild;
        directions.append(makeHeading(4, "Notes:", "recipe-notes-title"));
        directions.append(makeList(recipe.jsb_notes, "ul", "recipe-notes", "No notes added."));
        recipeCard.replaceChildren(header, details);

        if (currentUser) {
            fillForm(recipe);
        }
    }

    async function saveRecipe(event) {
        event.preventDefault();
        if (!currentUser) {
            formStatus.textContent = "Sign in with an invited account before saving.";
            return;
        }

        formStatus.textContent = "Saving recipe...";
        const selectedFile = formFields.photo.files[0];
        let photoPath = recipes.find((recipe) => recipe.uid_primary_key === formFields.id.value)?.txt_photo_path ?? null;

        try {
            if (selectedFile) {
                if (!ALLOWED_PHOTO_TYPES.has(selectedFile.type)) {
                    throw new Error("Choose a JPG, PNG, or WebP image.");
                }
                if (selectedFile.size > MAX_PHOTO_SIZE) {
                    throw new Error("The photo must be 5 MB or smaller.");
                }
                photoPath = await uploadPhoto(selectedFile);
            }

            const recipeData = {
                txt_title: formFields.title.value.trim(),
                txt_description: formFields.description.value.trim(),
                txt_chef: formFields.chef.value.trim(),
                jsb_ingredients: splitLines(formFields.ingredients.value),
                jsb_directions: splitLines(formFields.directions.value),
                jsb_notes: splitLines(formFields.notes.value),
                txt_photo_path: photoPath,
            };
            const recipeId = formFields.id.value;
            const query = recipeId
                ? supabase.from(RECIPE_TABLE).update(recipeData).eq("uid_primary_key", recipeId).select("uid_primary_key").single()
                : supabase.from(RECIPE_TABLE).insert({
                    ...recipeData,
                    uid_created_by: currentUser.id,
                    tmz_created_at: new Date().toISOString(),
                    bool_active: true,
                }).select("uid_primary_key").single();
            const { data, error } = await query;

            if (error) {
                throw error;
            }

            selectedRecipeId = data.uid_primary_key;
            formStatus.textContent = "Recipe saved.";
            recipeForm.reset();
            formFields.id.value = "";
            await loadRecipes();
        } catch (error) {
            formStatus.textContent = `Could not save recipe: ${error.message}`;
        }
    }

    async function uploadPhoto(file) {
        const extension = file.name.split(".").pop().toLowerCase();
        const path = `recipes/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
            contentType: file.type,
            upsert: false,
        });

        if (error) {
            throw error;
        }
        return path;
    }

    function startNewRecipe() {
        recipeForm.reset();
        formFields.id.value = "";
        formStatus.textContent = "";
        document.querySelector("#editor-title").textContent = "Add a recipe";
        formFields.title.focus();
    }

    function fillForm(recipe) {
        formFields.id.value = recipe.uid_primary_key;
        formFields.title.value = recipe.txt_title;
        formFields.description.value = recipe.txt_description ?? "";
        formFields.chef.value = recipe.txt_chef ?? "";
        formFields.ingredients.value = joinLines(recipe.jsb_ingredients);
        formFields.directions.value = joinLines(recipe.jsb_directions);
        formFields.notes.value = joinLines(recipe.jsb_notes);
        formFields.photo.value = "";
        document.querySelector("#editor-title").textContent = "Edit recipe";
    }
}

function makeRecipeSection(title, items, listType, listClass = "") {
    const section = document.createElement("section");
    section.className = "recipe-section";
    section.append(makeHeading(3, title));
    section.append(makeList(items, listType, listClass, "No items added."));
    return section;
}

function makeList(items, listType, listClass, emptyText) {
    const list = document.createElement(listType);
    if (listClass) {
        list.className = listClass;
    }
    const values = Array.isArray(items) ? items : [];
    if (values.length === 0) {
        const item = document.createElement("li");
        item.className = "recipe-empty";
        item.textContent = emptyText;
        list.append(item);
        return list;
    }
    values.forEach((value) => {
        const item = document.createElement("li");
        item.textContent = value;
        list.append(item);
    });
    return list;
}

function makeMetaField(label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "recipe-meta-item";
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    wrapper.append(term, description);
    return wrapper;
}

function makeHeading(level, text, className = "") {
    const heading = document.createElement(`h${level}`);
    heading.textContent = text;
    if (className) {
        heading.className = className;
    }
    return heading;
}

function makeParagraph(text, className) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    if (className) {
        paragraph.className = className;
    }
    return paragraph;
}

function makeMessageItem(text) {
    const item = document.createElement("li");
    item.className = "recipe-list-empty";
    item.textContent = text;
    return item;
}

function splitLines(value) {
    return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function joinLines(value) {
    return Array.isArray(value) ? value.join("\n") : "";
}

function formatDate(value) {
    if (!value) {
        return "Not available";
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(value));
}

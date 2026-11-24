SET local check_function_bodies = off;

CREATE TABLE "public"."tbl_recipes" (
  "uid_primary_key" uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "txt_title"       text                     NOT NULL,
  "txt_description" text                     NOT NULL,
  "txt_chef"        text                     NOT NULL DEFAULT ''::text,
  "jsb_ingredients" jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "jsb_directions"  jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "jsb_notes"       jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "txt_photo_path"  text,
  "tmz_created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "tmz_updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "bool_active"     boolean                  NOT NULL,
  CONSTRAINT "tblrecipes_jsbdirections_check" CHECK ((jsonb_typeof(jsb_directions) = 'array'::text)),
  CONSTRAINT "tblrecipes_jsbingredients_check" CHECK ((jsonb_typeof(jsb_ingredients) = 'array'::text)),
  CONSTRAINT "tblrecipes_jsbnotes_check" CHECK ((jsonb_typeof(jsb_notes) = 'array'::text)),
  CONSTRAINT "tblrecipes_pkey" PRIMARY KEY (uid_primary_key),
  CONSTRAINT "tblrecipes_txtdescription_check" CHECK ((char_length(btrim(txt_description)) > 0)),
  CONSTRAINT "tblrecipes_txttitle_check" CHECK ((char_length(btrim(txt_title)) > 0)),
  "uid_created_by"  uuid                     NOT NULL DEFAULT auth.uid(),
  "uid_updated_by"  uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."tbl_recipes"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_recipe_updated()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$begin
  new.tmz_updated_at = pg_catalog.now();
  new.uid_updated_by = current_user;
  return new;
end;$function$;

CREATE TRIGGER recipes_updated
  BEFORE UPDATE ON public.tbl_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_recipe_updated();

CREATE POLICY "Anyone can read tblrecipes" ON "public"."tbl_recipes"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Signed-in members can upload recipe photos" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'recipe-photos'::text) AND ((storage.foldername(name))[1] = 'recipes'::text)));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

COMMENT ON COLUMN "public"."tbl_recipes"."bool_active" IS 'Flag indicating if this entry is active.';

COMMENT ON COLUMN "public"."tbl_recipes"."jsb_directions" IS 'Array of the directions for the recipe.';

COMMENT ON COLUMN "public"."tbl_recipes"."jsb_ingredients" IS 'Array of the ingredients for the recipie.';

COMMENT ON COLUMN "public"."tbl_recipes"."jsb_notes" IS 'Array of additional notes for the recipe.';

COMMENT ON COLUMN "public"."tbl_recipes"."tmz_created_at" IS 'Timestamp when the recipe was first created.';

COMMENT ON COLUMN "public"."tbl_recipes"."tmz_updated_at" IS 'Timestamp of when the recipe was last updated.';

COMMENT ON COLUMN "public"."tbl_recipes"."txt_chef" IS 'Original chef of the recipe.';

COMMENT ON COLUMN "public"."tbl_recipes"."txt_description" IS 'Description of the recipie';

COMMENT ON COLUMN "public"."tbl_recipes"."txt_photo_path" IS 'Text link of the recipe photo.';

COMMENT ON COLUMN "public"."tbl_recipes"."txt_title" IS 'Title of the recipe.';

COMMENT ON COLUMN "public"."tbl_recipes"."uid_primary_key" IS 'Unique Primary Key of the table.';

COMMENT ON TABLE "public"."tbl_recipes" IS 'Table to hold recipe entries.';

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_recipe_updated"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."set_recipe_updated"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_recipe_updated"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_recipe_updated"() TO "service_role";

REVOKE ALL ON TABLE "public"."tbl_recipes" FROM "anon";

GRANT SELECT ON TABLE "public"."tbl_recipes" TO "anon";

REVOKE ALL ON TABLE "public"."tbl_recipes" FROM "authenticated";

GRANT SELECT, UPDATE ON TABLE "public"."tbl_recipes" TO "authenticated";

REVOKE ALL ON TABLE "public"."tbl_recipes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tbl_recipes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tbl_recipes" TO "service_role";

ALTER TABLE "public"."tbl_recipes"
  ADD CONSTRAINT "tblrecipes_uid_created_by_fkey" FOREIGN KEY (uid_created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "Signed-in members can add tblrecipes" ON "public"."tbl_recipes"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((uid_created_by = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Signed-in members can edit tblrecipes" ON "public"."tbl_recipes"
  FOR UPDATE
  TO "authenticated"
  USING (true)
  WITH CHECK ((uid_created_by = ( SELECT auth.uid() AS uid)));

COMMENT ON COLUMN "public"."tbl_recipes"."uid_created_by" IS 'UID of the user that created the recipe entry.';

ALTER TABLE "public"."tbl_recipes"
  ADD CONSTRAINT "tblrecipes_uid_updated_by_fkey" FOREIGN KEY (uid_updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN "public"."tbl_recipes"."uid_updated_by" IS 'UID of the user that last updated the recipe.';


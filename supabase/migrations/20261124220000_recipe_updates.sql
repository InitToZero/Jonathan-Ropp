ALTER TABLE "public"."tbl_recipes"
  ALTER COLUMN "uid_created_by" DROP NOT NULL,
  ALTER COLUMN "uid_updated_by" DROP NOT NULL;

GRANT INSERT ON TABLE "public"."tbl_recipes" TO "authenticated";

CREATE OR REPLACE FUNCTION public.set_recipe_updated()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
AS $function$
BEGIN
  new.tmz_updated_at = pg_catalog.now();
  new.uid_updated_by = auth.uid();
  RETURN new;
END;
$function$;

ALTER POLICY "Signed-in members can edit tblrecipes"
  ON "public"."tbl_recipes"
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

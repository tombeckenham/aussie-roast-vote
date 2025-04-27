CREATE TABLE "ai_roasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"content" text NOT NULL,
	"full_content" text,
	"generated_at" timestamp DEFAULT now(),
	"is_spicy" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "campaign_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"date_time" timestamp NOT NULL,
	"end_date_time" timestamp,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "candidate_qa" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"surname" text NOT NULL,
	"given_name" text NOT NULL,
	"name" text NOT NULL,
	"party_id" integer,
	"party_ballot_name" text,
	"is_independent" boolean DEFAULT false,
	"electoral_seat_id" integer NOT NULL,
	"ballot_position" integer,
	"position" text,
	"bio" text,
	"image_url" text,
	"twitter_handle" text,
	"facebook_url" text,
	"website_url" text,
	"key_policies" text[],
	"is_incumbent" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "electoral_seats" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state" text NOT NULL,
	"description" text,
	"is_marginial" boolean DEFAULT false,
	"current_mp" text,
	"current_party" text,
	"current_mp_photo_url" text,
	"key_issues" text[],
	"previous_results" json,
	"slug" text NOT NULL,
	"position" json,
	CONSTRAINT "electoral_seats_name_unique" UNIQUE("name"),
	CONSTRAINT "electoral_seats_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "localities" (
	"id" serial PRIMARY KEY NOT NULL,
	"postcode" text NOT NULL,
	"locality" text NOT NULL,
	"state" text NOT NULL,
	"state_code" text NOT NULL,
	"division_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"color" text,
	"logo_url" text,
	CONSTRAINT "parties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

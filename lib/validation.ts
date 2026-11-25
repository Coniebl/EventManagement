export interface RegistrationValidationErrors {
  full_name?: string;
  email?: string;
  mobile?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PH_MOBILE_REGEX = /^09\d{9}$/;

export function normalizeMobile(input: string): string {
  return input.replace(/[\s\-()]/g, "").trim();
}

export function validateRegistrationInput(input: {
  full_name: string;
  email: string;
  mobile: string;
}): RegistrationValidationErrors {
  const errors: RegistrationValidationErrors = {};

  const name = input.full_name.trim();
  const email = input.email.trim();
  const mobile = normalizeMobile(input.mobile);

  if (!name) {
    errors.full_name = "Full name is required.";
  } else if (name.length < 2) {
    errors.full_name = "Please enter your full name.";
  }

  if (!email) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Please enter a valid email address (e.g. name@example.com).";
  }

  if (!mobile) {
    errors.mobile = "Mobile number is required.";
  } else if (!PH_MOBILE_REGEX.test(mobile)) {
    errors.mobile =
      "Enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).";
  }

  return errors;
}

export interface EventValidationErrors {
  title?: string;
  venue?: string;
  starts_at?: string;
  ends_at?: string;
  capacity?: string;
  status?: string;
}

export function validateEventInput(input: {
  title: string;
  venue: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: string;
}): EventValidationErrors {
  const errors: EventValidationErrors = {};

  if (!input.title.trim()) errors.title = "Event title is required.";
  if (!input.venue.trim()) errors.venue = "Venue is required.";

  const start = new Date(input.starts_at);
  const end = new Date(input.ends_at);
  if (Number.isNaN(start.getTime())) {
    errors.starts_at = "Valid start date and time is required.";
  }
  if (Number.isNaN(end.getTime())) {
    errors.ends_at = "Valid end date and time is required.";
  }
  if (!errors.starts_at && !errors.ends_at && end <= start) {
    errors.ends_at = "End time must be after start time.";
  }

  if (!Number.isInteger(input.capacity) || input.capacity < 1) {
    errors.capacity = "Capacity must be a whole number of at least 1.";
  }

  if (!["draft", "published", "closed"].includes(input.status)) {
    errors.status = "Status must be Draft, Published, or Closed.";
  }

  return errors;
}

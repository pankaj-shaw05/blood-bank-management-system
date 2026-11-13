from django.db import migrations, models
from django.db.models import Q
from django.contrib.auth.models import User
from django.utils import timezone
import datetime

BLOOD_GROUPS = [
    ('A+', 'A+'),
    ('A-', 'A-'),
    ('B+', 'B+'),
    ('B-', 'B-'),
    ('AB+', 'AB+'),
    ('AB-', 'AB-'),
    ('O+', 'O+'),
    ('O-', 'O-'),
]

USER_ROLES = [
    ('DONOR', 'Blood Donor (Give Blood)'),
    ('HOSPITAL', 'Hospital / Healthcare (Need Blood)'),
    ('ADMIN', 'System Administrator'),
]

URGENCY_LEVELS = [
    ('Critical', 'Critical (Immediate / Emergency)'),
    ('High', 'High (Within 6 Hours)'),
    ('Moderate', 'Moderate (Within 24 Hours)'),
    ('Low', 'Low (Scheduled Surgery)'),
]

REQUEST_STATUS = [
    ('Urgent Needed', 'Urgent Needed'),
    ('In Progress', 'In Progress'),
    ('Fulfilled', 'Fulfilled'),
    ('Cancelled', 'Cancelled'),
]

CAMP_STATUS = [
    ('Upcoming', 'Upcoming'),
    ('Ongoing', 'Ongoing'),
    ('Completed', 'Completed'),
    ('Cancelled', 'Cancelled'),
]


class UserProfile(models.Model):
    """Profile extending default Django auth User with Role and Contact Info"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=USER_ROLES, default='DONOR')
    phone = models.CharField(max_length=25, blank=True)
    city = models.CharField(max_length=100, default='Jamshedpur')
    district = models.CharField(max_length=100, default='East Singhbhum')
    state = models.CharField(max_length=100, default='Jharkhand')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class DonorProfile(models.Model):
    """Verified Blood Donor Profile"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='donor_profile', null=True, blank=True)
    full_name = models.CharField(max_length=150)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUPS)
    age = models.PositiveIntegerField(default=25)
    gender = models.CharField(max_length=15, choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')], default='Male')
    phone = models.CharField(max_length=25)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, default='Jamshedpur')
    district = models.CharField(max_length=100, default='East Singhbhum')
    state = models.CharField(max_length=100, default='Jharkhand')
    last_donation_date = models.DateField(null=True, blank=True)
    total_donations = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True, help_text="Ready to donate blood on emergency notice")
    verified = models.BooleanField(default=True)
    avatar_url = models.URLField(blank=True, default="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80")
    created_at = models.DateTimeField(auto_now_add=True)

    def is_eligible(self):
        """Donors can donate every 90 days"""
        if not self.last_donation_date:
            return True
        days_passed = (timezone.now().date() - self.last_donation_date).days
        return days_passed >= 90

    def days_until_eligible(self):
        if not self.last_donation_date:
            return 0
        days_passed = (timezone.now().date() - self.last_donation_date).days
        return max(0, 90 - days_passed)

    def __str__(self):
        return f"{self.full_name} ({self.blood_group}) - {self.city}"


class Hospital(models.Model):
    """Verified Healthcare Facility located in East Singhbhum"""
    user = models.OneToOneField(User, on_delete=models.SET_NULL, related_name='hospital_profile', null=True, blank=True)
    hospital_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    short_name = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=120)
    subdivision = models.CharField(max_length=100, default='Dhalbhum')
    locality = models.CharField(max_length=100)
    city = models.CharField(max_length=100, default='Jamshedpur')
    district = models.CharField(max_length=100, default='East Singhbhum')
    state = models.CharField(max_length=100, default='Jharkhand')
    pincode = models.CharField(max_length=15, blank=True)
    address = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    phone = models.CharField(max_length=35)
    emergency_phone = models.CharField(max_length=35, blank=True)
    beds = models.PositiveIntegerField(default=100)
    has_blood_bank = models.BooleanField(default=True)
    blood_bank_status = models.CharField(max_length=255)
    available_units = models.PositiveIntegerField(default=30)
    verified_inside_geofence = models.BooleanField(default=True)
    image_url = models.URLField(blank=True, default="https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.locality}"


class BloodInventory(models.Model):
    """Central Real-Time Blood Stock Tracking"""
    blood_group = models.CharField(max_length=5, unique=True, choices=BLOOD_GROUPS)
    units = models.PositiveIntegerField(default=50)
    optimal = models.PositiveIntegerField(default=150)
    critical = models.PositiveIntegerField(default=25)
    red_cells = models.PositiveIntegerField(default=30)
    platelets = models.PositiveIntegerField(default=15)
    plasma = models.PositiveIntegerField(default=10)
    last_updated = models.DateTimeField(auto_now=True)

    @property
    def status_level(self):
        if self.units <= self.critical:
            return "Critical Low"
        elif self.units < self.optimal:
            return "Moderate"
        return "Optimal"

    @property
    def percentage_capacity(self):
        if not self.optimal:
            return 100
        return min(100, int((self.units / self.optimal) * 100))

    def __str__(self):
        return f"{self.blood_group}: {self.units} Units ({self.status_level})"


class BloodRequest(models.Model):
    """Emergency Blood Requisition broadcasted to Hospitals & Donors"""
    request_code = models.CharField(max_length=25, unique=True)
    patient_name = models.CharField(max_length=150)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUPS)
    units_needed = models.PositiveIntegerField(default=1)
    hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True, related_name='requisitions')
    hospital_name = models.CharField(max_length=200)
    city = models.CharField(max_length=100, default='Jamshedpur')
    district = models.CharField(max_length=100, default='East Singhbhum')
    latitude = models.FloatField(default=22.8015)
    longitude = models.FloatField(default=86.1796)
    contact_person = models.CharField(max_length=150)
    contact_phone = models.CharField(max_length=30)
    urgency = models.CharField(max_length=20, choices=URGENCY_LEVELS, default='Critical')
    required_date = models.DateField(default=datetime.date.today)
    status = models.CharField(max_length=30, choices=REQUEST_STATUS, default='Urgent Needed')
    case_detail = models.TextField(blank=True)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # 1. Auto-link hospital if requested_by has a hospital profile
        if not self.hospital_id and self.requested_by:
            user_hosp = getattr(self.requested_by, 'hospital_profile', None) or Hospital.objects.filter(user=self.requested_by).first()
            if user_hosp:
                self.hospital = user_hosp

        # 2. Auto-link hospital ForeignKey if null based on hospital_name
        if not self.hospital_id and self.hospital_name:
            name_clean = self.hospital_name.strip()
            # Direct or icontains match against existing hospitals in DB
            direct_hosp = Hospital.objects.filter(name__iexact=name_clean).first()
            if not direct_hosp:
                direct_hosp = Hospital.objects.filter(name__icontains=name_clean.split(',')[0].strip()).first()
            if not direct_hosp:
                name_lower = self.hospital_name.lower()
                if 'tata' in name_lower or 'tmh' in name_lower:
                    direct_hosp = Hospital.objects.filter(Q(hospital_id='HOSP-ES-01') | Q(name__icontains='Tata Main')).first()
                elif 'mgm' in name_lower:
                    direct_hosp = Hospital.objects.filter(Q(hospital_id='HOSP-ES-02') | Q(name__icontains='MGM')).first()
                elif 'tinplate' in name_lower:
                    direct_hosp = Hospital.objects.filter(name__icontains='Tinplate').first()
                elif 'brahmananda' in name_lower or 'narayana' in name_lower:
                    direct_hosp = Hospital.objects.filter(name__icontains='Brahmananda').first()
                elif 'mercy' in name_lower:
                    direct_hosp = Hospital.objects.filter(name__icontains='Mercy').first()
                elif 'sadar' in name_lower:
                    direct_hosp = Hospital.objects.filter(name__icontains='Sadar').first()
                elif 'rajasthan' in name_lower:
                    direct_hosp = Hospital.objects.filter(name__icontains='Rajasthan').first()
            if direct_hosp:
                self.hospital = direct_hosp

        if self.hospital:
            if not self.hospital_name:
                self.hospital_name = self.hospital.name
            if not self.city or self.city == 'Jamshedpur':
                self.city = self.hospital.locality
            self.latitude = self.hospital.latitude
            self.longitude = self.hospital.longitude
            if not self.requested_by and self.hospital.user:
                self.requested_by = self.hospital.user

        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.request_code}] {self.patient_name} - {self.blood_group} ({self.units_needed} units)"


class DonationCamp(models.Model):
    """Blood Donation Drives & Community Camps"""
    camp_code = models.CharField(max_length=25, unique=True)
    title = models.CharField(max_length=200)
    organizer = models.CharField(max_length=200)
    date = models.DateField()
    time_slot = models.CharField(max_length=100, default="09:00 AM - 05:00 PM")
    venue = models.CharField(max_length=255)
    city = models.CharField(max_length=100, default='Jamshedpur')
    target_units = models.PositiveIntegerField(default=200)
    registered_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=CAMP_STATUS, default='Upcoming')
    image_url = models.URLField(blank=True, default="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.title} ({self.date})"


class CampRegistration(models.Model):
    """Registrations for Donation Drives"""
    camp = models.ForeignKey(DonationCamp, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='camp_registrations')
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=25)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUPS)
    registered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} -> {self.camp.title}"


class BloodDonationRecord(models.Model):
    """Historical records of blood donations by donors"""
    donor = models.ForeignKey(DonorProfile, on_delete=models.CASCADE, related_name='donations')
    hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True)
    camp = models.ForeignKey(DonationCamp, on_delete=models.SET_NULL, null=True, blank=True)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUPS)
    units = models.PositiveIntegerField(default=1)
    donation_date = models.DateField(default=datetime.date.today)
    certificate_code = models.CharField(max_length=60, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='Completed')

    class Meta:
        ordering = ['-donation_date']

    def __str__(self):
        return f"{self.donor.full_name} donated {self.units} units on {self.donation_date}"

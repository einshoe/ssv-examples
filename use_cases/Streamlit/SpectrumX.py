import json

class SpectrumX:
    def __init__(self, name):
        self.wavelength = []
        self.intensity = []
        self.variance = []
        self.sky = []
        self.dohelio = false
        self.docmb = false

        #
        self.properties = {}
        self.properties.id = ""
        self.properties.name = name
        self.properties.ra = null
        self.properties.dec = null
        self.properties.magnitude = null

        self.properties.type = ""
        self.properties.longitude = null
        self.properties.longitude = null
        self.properties.latitude = null
        self.properties.altitude = null
        self.properties.juliandate = ""
        self.properties.epoch = ""
        self.properties.radecsys = ""


        # one way to handle missing properties (good enough for the ui)
        self.properties.ra = 0
        self.properties.dec = 0
        self.properties.magnitude = 0
        self.properties.longitude = 0
        self.properties.longitude = 0
        self.properties.latitude = 0
        self.properties.altitude = 0
    def fromDictionary(self, dict):
        if (dict["wavelength"]):
            self.wavelength = dict["wavelength"]
        if (dict["intensity"]):
            self.intensity = dict["intensity"]
        if (dict["variance"]):
            self.variance = dict["variance"]
        if (dict["sky"]):
            self.sky = dict["sky"]
        if (dict["dohelio"]):
            self.dohelio = dict["dohelio"]
        if (dict["docmb"]):
            self.docmb = dict["docmb"]

        if (dict["properties"]):
            self.properties = dict["properties"]
            # TODO: The code below is not required (unless I want some kind of checking here)
            if (self.properties["id"]):
                self.properties.id = self.properties["id"]
            if (self.properties["name"]):
                self.properties.name = self.properties["name"]
            if (self.properties["type"]):
                self.properties.type = self.properties["type"]
            if (self.properties["ra"]):
                self.properties.ra = self.properties["ra"]
            else:
                self.properties.ra = 0
            if (self.properties["dec"]):
                self.properties.dec = self.properties["dec"]
            else:
                self.properties.dec = 0
            if (self.properties["magnitude"]) {
                self.properties.magnitude = self.properties["magnitude"]
            else:
                self.properties.magnitude = 0
            if (self.properties["longitude"]):
                self.properties.longitude = self.properties["longitude"]
            else:
                self.properties.longitude = 0
            if (self.properties["latitude"]):
                self.properties.latitude = self.properties["latitude"]
            else:
                self.properties.latitude = 0
            if (self.properties["altitude"]):
                self.properties.altitude = self.properties["altitude"]
            else
                self.properties.altitude = 0
            if (self.properties["juliandate"]):
                self.properties.juliandate = self.properties["juliandate"]
            if (self.properties["epoch"]):
                self.properties.epoch = self.properties["epoch"]
            if (self.properties["radecsys"]):
                self.properties.radecsys = self.properties["radecsys"]
    # Description properties
    def getId(self):
        return self.properties.id
    def setId(self, myid):
        self.properties.id = myid
    def getName(self):
        return self.properties.name
    def setName(self,name):
        self.properties.name = name
    def getRightAscension(self):
        return self.properties.ra
    def setRightAscension(self, rightAscension):
        self.properties.ra = rightAscension
    def getDeclination(self):
        return self.properties.dec
    def setDeclination(self, declination):
        self.properties.dec = declination
    def getMagnitude(self):
        return self.properties.magnitude
    def setMagnitude(self, magnitude):
        self.properties.magnitude = magnitude
    def getType(self):
        return self.properties.type
    def setType(self, mytype):
        self.properties.type = mytype
    # Spectra data arrays
    def getWavelength(self):
        return self.wavelength
    def setWavelength(self, wavelength):
        self.wavelength = wavelength
    def getIntensity(self):
        return self.intensity
    def setIntensity(self, intensity):
        self.intensity = intensity
    def getVariance(self):
        return self.variance
    def setVariance(self, variance):
        self.variance = variance
    def getSky(self):
        return self.sky
    def setSky(self, sky):
        self.sky = sky
    def getDoHelio(self):
        return self.dohelio
    def getHelio(self):
        if (self.dohelio) {
            return getHeliocentricVelocityCorrection(
                self.getRightAscension()  * 180 / Math.PI,
                self.getDeclination() * 180 / Math.PI,
                self.properties.juliandate, self.properties.longitude, self.properties.latitude, self.properties.altitude, self.properties.epoch, self.properties.radecsys)
        }
        return null
    def getDoCMB(self):
        return self.docmb
    def getCMB(self):
        if (self.docmb):
            return self.getCMBCorrection(
                self.getRightAscension()  * 180 / Math.PI,
                self.getDeclination() * 180 / Math.PI,
                self.properties.epoch, self.properties.radecsys
            )
        return null
    # Good enough method to tell if v is a dictionary or not
    #def isDict(v):
    #    return typeof v==='object' && v!==null && !(v instanceof Array) && !(v instanceof Date)
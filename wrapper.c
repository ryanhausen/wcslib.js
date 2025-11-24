#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "wcs.h"
#include "wcslib.h"
#include "wcshdr.h"

static struct wcsprm *wcs = NULL;

int getWcs(const char *header) {
    int status = 0;
    int nreject, nwcs;

    size_t len = strlen(header);
    int nkeyrec = (int)(len / 80);

    // Parse header: wcspih will allocate and fill wcs
    status = wcspih((char *)header, nkeyrec, 0, 0, &nreject, &nwcs, &wcs);
    if (status) {
        fprintf(stderr, "WCSLIB parse error: %d\n", status);
        return status;
    }

    // Setup internal state
    status = wcsset(wcs);
    return status;
}

int pix2sky(double x, double y, double *ra, double *dec) {
    int status = 0;
    double imgcrd[2], phi, theta, world[2];
    double pixcrd[2] = {x, y};

    status = wcsp2s(wcs, 1, 2, pixcrd, imgcrd, &phi, &theta, world, NULL);
    if (status == 0) {
        *ra  = world[0];
        *dec = world[1];
    }
    return status;
}

int sky2pix(double ra, double dec, double *x, double *y) {
    int status = 0;
    double world[2] = {ra, dec};
    double imgcrd[2], phi, theta, pixcrd[2];

    status = wcss2p(wcs, 1, 2, world, imgcrd, &phi, &theta, pixcrd, NULL);
    if (status == 0) {
        *x = pixcrd[0];
        *y = pixcrd[1];
    }
    return status;
}

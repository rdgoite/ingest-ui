import {AuthenticationService} from "./authentication.service";
import {TestBed} from "@angular/core/testing";
import {HttpClientTestingModule, HttpTestingController} from "@angular/common/http/testing";

describe('Get Account', () => {
  let service: AuthenticationService;
  let remoteService: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthenticationService],
      imports: [HttpClientTestingModule],
    });

    service = TestBed.get(AuthenticationService)
    remoteService = TestBed.get(HttpTestingController)
  })

  it('should return an Account', (done) => {
    //expect:
    let accountId = 'c83bf90';
    service.getAccount().subscribe(account => {
      expect(account).toBeTruthy();
      expect(account.id).toEqual(accountId);
    })

    //given:
    const request = remoteService.expectOne('/test');
    expect(request.request.method).toEqual('GET');

    and:
    request.flush({
      'id': accountId,
    });

    //and:
    remoteService.verify();
    done();
  });
})
